// 数据审计脚本，用于检测数据异常
import dotenv from 'dotenv';
// 加载环境变量
dotenv.config({ path: '.env.local' });
import { supabase } from '@/lib/supabase/client';

// 定义数据异常类型
interface DataAnomaly {
  table: string;
  type: string;
  description: string;
  recordCount: number;
  sampleRecords?: Record<string, unknown>[];
}

// 数据审计结果类型
interface DataAuditResult {
  timestamp: string;
  anomalies: DataAnomaly[];
  totalAnomalies: number;
}

// 审计日志函数
function logAudit(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 检测缺失的字段值
async function detectMissingFields(table: string, fields: string[]): Promise<DataAnomaly[]> {
  logAudit(`开始检测 ${table} 表的缺失字段...`);
  
  const anomalies: DataAnomaly[] = [];
  
  for (const field of fields) {
    try {
      const { count } = await supabase
        .from(table)
        .select(`id, ${field}`, { count: 'exact', head: true })
        .is(field, null);
      
      if (count && count > 0) {
        // 获取样本记录
        const { data: sampleData } = await supabase
          .from(table)
          .select(`id, ${field}`)
          .is(field, null)
          .limit(5);
        
        anomalies.push({
          table,
          type: 'missing_field',
          description: `${table}表中存在${count}条记录的${field}字段缺失`,
          recordCount: count,
          sampleRecords: Array.isArray(sampleData) && sampleData.every(record => typeof record === 'object' && record !== null && !('error' in record)) 
            ? sampleData as Record<string, unknown>[] 
            : undefined
        });
      }
    } catch (error) {
      console.error(`检测${table}表${field}字段缺失时出错:`, error);
    }
  }
  
  return anomalies;
}

// 检测无效的字段值
async function detectInvalidValues(table: string, field: string, validValues: string[]): Promise<DataAnomaly | null> {
  logAudit(`开始检测 ${table} 表 ${field} 字段的无效值...`);
  
  try {
    // 直接传递数组给Supabase客户端，而不是格式化字符串
    const { count } = await supabase
      .from(table)
      .select(`id, ${field}`, { count: 'exact', head: true })
      .not(field, 'in', validValues);
    
    if (count && count > 0) {
      // 获取样本记录
      const { data: sampleData } = await supabase
        .from(table)
        .select(`id, ${field}`)
        .not(field, 'in', validValues)
        .limit(5);
      
      return {
        table,
        type: 'invalid_value',
        description: `${table}表中存在${count}条记录的${field}字段值无效，有效值应为: ${validValues.join(', ')}`,
        recordCount: count,
        sampleRecords: Array.isArray(sampleData) && sampleData.every(record => typeof record === 'object' && record !== null && !('error' in record)) 
          ? sampleData as Record<string, unknown>[] 
          : undefined
      };
    }
  } catch (error) {
    console.error(`检测${table}表${field}字段无效值时出错:`, error);
  }
  
  return null;
}

// 检测重复的数据
async function detectDuplicateData(table: string, uniqueFields: string[]): Promise<DataAnomaly | null> {
  logAudit(`开始检测 ${table} 表的重复数据...`);
  
  try {
    // 使用Supabase客户端获取所有数据并在内存中检测重复
    const { data } = await supabase
      .from(table)
      .select(uniqueFields.join(', '));
    
    if (data && Array.isArray(data) && data.length > 0) {
      // 使用Map来检测重复数据
      const uniqueMap = new Map<string, Record<string, unknown>[]>();
      
      data.forEach(record => {
        // 确保record是对象类型
        if (typeof record === 'object' && record !== null) {
          // 生成唯一键
          const key = uniqueFields.map(field => {
            // 使用类型断言确保field存在于record中
            const value = (record as Record<string, unknown>)[field];
            return value === null || value === undefined ? '' : String(value);
          }).join('_');
          
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, []);
          }
          
          uniqueMap.get(key)?.push(record as Record<string, unknown>);
        }
      });
      
      // 找出重复的数据组
      const duplicateGroups = Array.from(uniqueMap.values())
        .filter(group => group.length > 1);
      
      if (duplicateGroups.length > 0) {
        return {
          table,
          type: 'duplicate_data',
          description: `${table}表中存在${duplicateGroups.length}组重复数据，基于字段: ${uniqueFields.join(', ')}`,
          recordCount: duplicateGroups.length,
          sampleRecords: duplicateGroups.slice(0, 5).map(group => ({
            ...group[0],
            count: group.length
          }))
        };
      }
    }
  } catch (error) {
    console.error(`检测${table}表重复数据时出错:`, error);
  }
  
  return null;
}

// 检测外键约束违反
async function detectForeignKeyViolations(table: string, foreignKeyField: string, referenceTable: string, referenceField: string): Promise<DataAnomaly | null> {
  logAudit(`开始检测 ${table} 表的外键约束违反...`);
  
  try {
    // 获取所有相关数据
    const { data: tableData } = await supabase
      .from(table)
      .select(`id, ${foreignKeyField}`)
      .not(foreignKeyField, 'is', null);
    
    if (tableData && Array.isArray(tableData) && tableData.length > 0) {
      // 获取引用表的所有相关字段值
      const { data: referenceData } = await supabase
        .from(referenceTable)
        .select(referenceField);
      
      if (referenceData && Array.isArray(referenceData)) {
        // 创建引用值的Set以快速查找
        const referenceValues = new Set(referenceData
          .filter(record => typeof record === 'object' && record !== null && !('error' in record))
          .map(record => {
            return (record as Record<string, unknown>)[referenceField];
          }));
        
        // 找出违反外键约束的记录
        const validTableData = tableData.filter(record => typeof record === 'object' && record !== null && !('error' in record));
        const violatingRecords = validTableData.filter(record => {
          const foreignKeyValue = (record as Record<string, unknown>)[foreignKeyField];
          return foreignKeyValue !== null && !referenceValues.has(foreignKeyValue);
        });
        
        if (violatingRecords.length > 0) {
          return {
            table,
            type: 'foreign_key_violation',
            description: `${table}表中存在${violatingRecords.length}条记录的${foreignKeyField}字段违反外键约束，引用的${referenceTable}.${referenceField}不存在`,
            recordCount: violatingRecords.length,
            sampleRecords: violatingRecords.slice(0, 5) as Record<string, unknown>[]
          };
        }
      }
    }
  } catch (error) {
    console.error(`检测${table}表外键约束违反时出错:`, error);
  }
  
  return null;
}

// 执行全面的数据审计
async function performDataAudit(): Promise<DataAuditResult> {
  logAudit('开始执行全面的数据审计...');
  
  const anomalies: DataAnomaly[] = [];
  
  // 1. 检测 confessions 表的异常
  // 检测缺失字段
  const confessionMissingFields = await detectMissingFields('confessions', ['content', 'is_anonymous', 'created_at', 'likes_count', 'status']);
  anomalies.push(...confessionMissingFields);
  
  // 检测无效的 status 值
  const confessionInvalidStatus = await detectInvalidValues('confessions', 'status', ['approved', 'rejected', 'pending']);
  if (confessionInvalidStatus) {
    anomalies.push(confessionInvalidStatus);
  }
  
  // 检测外键约束违反
  const confessionForeignKeyViolation = await detectForeignKeyViolations('confessions', 'user_id', 'auth.users', 'id');
  if (confessionForeignKeyViolation) {
    anomalies.push(confessionForeignKeyViolation);
  }
  
  // 2. 检测 comments 表的异常
  // 检测缺失字段
  const commentMissingFields = await detectMissingFields('comments', ['content', 'is_anonymous', 'created_at', 'confession_id', 'user_id']);
  anomalies.push(...commentMissingFields);
  
  // 检测外键约束违反
  const commentConfessionForeignKeyViolation = await detectForeignKeyViolations('comments', 'confession_id', 'confessions', 'id');
  if (commentConfessionForeignKeyViolation) {
    anomalies.push(commentConfessionForeignKeyViolation);
  }
  
  const commentUserForeignKeyViolation = await detectForeignKeyViolations('comments', 'user_id', 'auth.users', 'id');
  if (commentUserForeignKeyViolation) {
    anomalies.push(commentUserForeignKeyViolation);
  }
  
  // 3. 检测 likes 表的异常
  // 检测缺失字段
  const likeMissingFields = await detectMissingFields('likes', ['confession_id', 'user_id', 'created_at']);
  anomalies.push(...likeMissingFields);
  
  // 检测外键约束违反
  const likeConfessionForeignKeyViolation = await detectForeignKeyViolations('likes', 'confession_id', 'confessions', 'id');
  if (likeConfessionForeignKeyViolation) {
    anomalies.push(likeConfessionForeignKeyViolation);
  }
  
  const likeUserForeignKeyViolation = await detectForeignKeyViolations('likes', 'user_id', 'auth.users', 'id');
  if (likeUserForeignKeyViolation) {
    anomalies.push(likeUserForeignKeyViolation);
  }
  
  // 检测重复数据
  const likeDuplicateData = await detectDuplicateData('likes', ['confession_id', 'user_id']);
  if (likeDuplicateData) {
    anomalies.push(likeDuplicateData);
  }
  
  // 4. 检测 confession_images 表的异常
  // 检测缺失字段
  const confessionImageMissingFields = await detectMissingFields('confession_images', ['image_url', 'file_type', 'is_locked', 'lock_type', 'confession_id']);
  anomalies.push(...confessionImageMissingFields);
  
  // 检测无效的 file_type 值
  const confessionImageInvalidFileType = await detectInvalidValues('confession_images', 'file_type', ['image', 'video']);
  if (confessionImageInvalidFileType) {
    anomalies.push(confessionImageInvalidFileType);
  }
  
  // 检测无效的 lock_type 值
  const confessionImageInvalidLockType = await detectInvalidValues('confession_images', 'lock_type', ['password', 'user', 'public']);
  if (confessionImageInvalidLockType) {
    anomalies.push(confessionImageInvalidLockType);
  }
  
  // 检测外键约束违反
  const confessionImageForeignKeyViolation = await detectForeignKeyViolations('confession_images', 'confession_id', 'confessions', 'id');
  if (confessionImageForeignKeyViolation) {
    anomalies.push(confessionImageForeignKeyViolation);
  }
  
  // 5. 检测 profiles 表的异常
  // 检测缺失字段
  const profileMissingFields = await detectMissingFields('profiles', ['username', 'display_name', 'created_at']);
  anomalies.push(...profileMissingFields);
  
  logAudit('数据审计完成!');
  
  return {
    timestamp: new Date().toISOString(),
    anomalies,
    totalAnomalies: anomalies.length
  };
}

// 运行数据审计
performDataAudit()
  .then(result => {
    console.log('\n=== 数据审计报告 ===');
    console.log(`审计时间: ${result.timestamp}`);
    console.log(`总异常数: ${result.totalAnomalies}`);
    console.log('\n异常详情:');
    
    if (result.anomalies.length === 0) {
      console.log('✅ 未发现数据异常');
    } else {
      result.anomalies.forEach((anomaly, index) => {
        console.log(`\n${index + 1}. [${anomaly.type}] ${anomaly.table}表: ${anomaly.description}`);
        console.log(`   记录数: ${anomaly.recordCount}`);
        
        if (anomaly.sampleRecords && anomaly.sampleRecords.length > 0) {
          console.log('   样本记录:');
          anomaly.sampleRecords.forEach(record => {
            console.log(`     - ${JSON.stringify(record)}`);
          });
        }
      });
    }
    
    console.log('\n=== 数据审计报告结束 ===');
  })
  .catch(error => {
    console.error('数据审计过程中出错:', error);
  });
