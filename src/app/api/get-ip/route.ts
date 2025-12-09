// 服务器端API路由，用于代理获取IP地址请求，避免CORS问题
import { NextResponse } from 'next/server';

// 定义IP查询服务列表，支持获取城市、省份信息和代理检测
// 优化服务顺序，优先使用高精度、高可靠性的服务，增强代理检测能力
// 优先使用国内IP服务和高精度全球服务，确保返回中文结果
const ipServices = [
  // 高精度国内IP服务，提供更准确的国内地址，支持中文
  { 
    url: 'https://whois.pconline.com.cn/ipJson.jsp?json=true', 
    name: 'pconline.com.cn', 
    ipPath: 'ip', 
    cityPath: 'city', 
    provincePath: 'pro',
    countryPath: 'country',
    proxyPath: '',
    trust: 98, // 高准确率的国内IP服务，返回中文
    lang: 'zh-CN'
  },
  { 
    url: 'https://api.ip.sb/json?lang=zh-CN', 
    name: 'ip.sb', 
    ipPath: 'ip', 
    cityPath: 'city', 
    provincePath: '',
    countryPath: 'country',
    proxyPath: '',
    trust: 95 // 高准确率的国内IP服务，支持中文
  },
  { 
    url: 'https://ipwho.is/', 
    name: 'ipwho.is', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'region',
    countryPath: 'country',
    proxyPath: 'connection.proxy',
    trust: 92
  },
  { 
    url: 'https://ipapi.co/json/', 
    name: 'ipapi.co', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'region',
    countryPath: 'country_name',
    proxyPath: 'proxy',
    trust: 90
  },
  { 
    url: 'https://api.ipgeolocation.io/ipgeo?apiKey=32bcd4a6e4b548968e7afcdb682ac679&lang=zh-CN', 
    name: 'ipgeolocation.io', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'state_prov',
    countryPath: 'country_name',
    proxyPath: 'is_proxy',
    trust: 88, // 支持中文结果
    lang: 'zh-CN'
  },
  { 
    url: 'https://api.ipregistry.co/?key=tryout&lang=zh-CN', 
    name: 'ipregistry.co', 
    ipPath: 'ip', 
    cityPath: 'location.city',
    provincePath: 'location.region.name',
    countryPath: 'location.country.name',
    proxyPath: 'security.is_proxy',
    trust: 87, // 支持中文结果
    lang: 'zh-CN'
  },
  { 
    url: 'https://ipinfo.io/json', 
    name: 'ipinfo.io', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'region',
    countryPath: 'country',
    proxyPath: 'hostname',
    trust: 85
  },
  // 新增高精度IP服务
  { 
    url: 'https://freeipapi.com/api/json/', 
    name: 'freeipapi.com', 
    ipPath: 'ipAddress', 
    cityPath: 'cityName',
    provincePath: 'regionName',
    countryPath: 'countryName',
    proxyPath: '',
    trust: 86
  },
  { 
    url: 'https://api.freegeoip.app/json/?apikey=1234567890&lang=zh-CN', 
    name: 'freegeoip.app', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'region_name',
    countryPath: 'country_name',
    proxyPath: '',
    trust: 84, // 支持中文结果
    lang: 'zh-CN'
  },
  { 
    url: 'https://api.my-ip.io/v1/geo.json', 
    name: 'my-ip.io', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'region',
    countryPath: 'country',
    trust: 82
  },
  // 代理检测专用服务
  { 
    url: 'https://proxycheck.io/v2/', 
    name: 'proxycheck.io', 
    ipPath: '', 
    cityPath: 'city',
    provincePath: 'region',
    countryPath: 'country',
    proxyPath: 'proxy',
    trust: 88
  },
  { 
    url: 'https://proxydb.net/api/v1/ip/', 
    name: 'proxydb.net', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'region',
    countryPath: 'country',
    trust: 80
  },
  // 纯IP服务作为回退，只有在没有地理位置服务可用时才使用
  { 
    url: 'https://api64.ipify.org?format=json', 
    name: 'ipify.org', 
    ipPath: 'ip', 
    cityPath: '',
    provincePath: '',
    countryPath: '',
    trust: 95
  },
  { 
    url: 'https://jsonip.com/', 
    name: 'jsonip.com', 
    ipPath: 'ip', 
    cityPath: '',
    provincePath: '',
    countryPath: '',
    trust: 85
  },
  { 
    url: 'https://api.ipify.org?format=json', 
    name: 'ipify.org (IPv4)', 
    ipPath: 'ip', 
    cityPath: '',
    provincePath: '',
    countryPath: '',
    trust: 95
  },
  // AWS作为最后的可靠回退，只有IP，没有地理位置
  { 
    url: 'https://checkip.amazonaws.com/', 
    name: 'aws', 
    ipPath: '', // 直接返回IP地址
    cityPath: '',
    provincePath: '',
    countryPath: '',
    trust: 100
  }
];

export async function GET() {
  try {
    const errorMessages: string[] = [];
    const results: Array<{
      ip: string;
      city: string;
      province: string;
      country: string;
      is_proxy: boolean;
      service: string;
      trust: number;
      complete: boolean;
    }> = [];
    
    // 先获取基础IP地址，用于proxycheck.io服务
    let baseIp: string | null = null;
    
    // 尝试所有IP服务，收集结果
    for (const service of ipServices) {
      try {
        // 服务器端fetch没有CORS限制
        // 使用AbortController实现超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort(new Error('Request timeout'));
        }, 5000);
        
        let serviceUrl = service.url;
        
        // 处理proxycheck.io服务的特殊情况（需要先获取IP）
        if (service.name === 'proxycheck.io' && baseIp) {
          serviceUrl = `${service.url}${baseIp}?vpn=1&asn=1`;
        } else if (service.name === 'proxycheck.io') {
          // 如果还没有基础IP，跳过proxycheck.io，后面再试
          clearTimeout(timeoutId);
          continue;
        }
        
        // 对于AWS服务，我们不需要JSON accept header
        const response = await fetch(serviceUrl, {
          headers: service.name === 'aws' ? {} : {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          let ipAddress: string | undefined;
          let data: Record<string, unknown> = {};
          let city = '未知城市';
          let province = '未知省份';
          let country = '未知国家';
          let isProxy = false;
          let complete = false;
          
          // 处理AWS服务的特殊情况（直接返回IP字符串）
          if (service.name === 'aws') {
            ipAddress = (await response.text()).trim();
            baseIp = ipAddress; // 设置基础IP
          } else {
            // 其他服务返回JSON
            data = await response.json();
            
            // 简单路径解析函数，处理空路径情况
            const getValueByPath = (obj: Record<string, unknown>, path: string): unknown => {
              if (!obj || typeof obj !== 'object' || !path) return undefined;
              
              let result: unknown = obj;
              const pathParts = path.split('.');
              
              for (const part of pathParts) {
                if (!result || typeof result !== 'object') {
                  return undefined;
                }
                result = (result as Record<string, unknown>)[part];
              }
              
              return result;
            };
            
            // 处理proxycheck.io的特殊响应格式
            let processedData = data;
            if (service.name === 'proxycheck.io' && baseIp && data[baseIp]) {
              processedData = data[baseIp] as Record<string, unknown>;
            }
            
            // 根据服务配置获取信息
            ipAddress = getValueByPath(processedData, service.ipPath) as string | undefined;
            
            // 对于纯IP服务，确保获取到IP
            if (!ipAddress && (service.name.includes('ipify') || service.name === 'jsonip.com')) {
              ipAddress = data['ip'] as string | undefined;
            }
            
            // 如果获取到IP，设置为基础IP
            if (ipAddress) {
              baseIp = ipAddress;
              
              // 处理城市、省份和国家信息
              if (service.cityPath) {
                const cityValue = getValueByPath(processedData, service.cityPath as string);
                if (cityValue && typeof cityValue === 'string') {
                  city = cityValue;
                }
              }
              
              if (service.provincePath) {
                const provinceValue = getValueByPath(processedData, service.provincePath as string);
                if (provinceValue && typeof provinceValue === 'string') {
                  province = provinceValue;
                }
              }
              
              if (service.countryPath) {
                const countryValue = getValueByPath(processedData, service.countryPath as string);
                if (countryValue && typeof countryValue === 'string') {
                  country = countryValue;
                }
              }
              
              // 标记是否有完整的地理位置信息
              complete = city !== '未知城市' && province !== '未知省份' && country !== '未知国家';
            }
          }
          
          if (ipAddress) {
            // 综合代理检测，使用多种方式
            
            // 1. 检查直接的代理字段 - 增强版本，支持更多字段和值类型
            const directProxyFields = ['proxy', 'is_proxy', 'hosting', 'vpn', 'tor', 'datacenter', 'anonymous', 'is_vpn', 'is_tor', 'is_datacenter', 'is_anonymous'];
            for (const field of directProxyFields) {
              const value = data[field] || 
                          (service.name === 'proxycheck.io' && baseIp ? (data[baseIp] as Record<string, unknown>)[field] : undefined) ||
                          (data['security'] && typeof data['security'] === 'object' ? (data['security'] as Record<string, unknown>)[field] : undefined) ||
                          (data['connection'] && typeof data['connection'] === 'object' ? (data['connection'] as Record<string, unknown>)[field] : undefined);
              
              if (value) {
                if (typeof value === 'boolean' && value) {
                  isProxy = true;
                  break;
                } else if (typeof value === 'string' && value.length > 0) {
                  const valueStr = value.toLowerCase();
                  if (valueStr === 'yes' || valueStr === 'true' || valueStr === '1' || valueStr === 'active') {
                    isProxy = true;
                    break;
                  }
                } else if (typeof value === 'number' && value > 0) {
                  isProxy = true;
                  break;
                }
              }
            }
            
            // 2. 检查服务特定的代理路径 - 增强版本
            if ('proxyPath' in service && service.proxyPath) {
              // 解析服务特定的代理路径
              const proxyValue = typeof service.proxyPath === 'string' && service.proxyPath 
                ? (() => {
                    // 如果是路径表达式，解析它
                    if (service.proxyPath.includes('.')) {
                      const pathParts = service.proxyPath.split('.');
                      let result: unknown = data;
                      for (const part of pathParts) {
                        if (!result || typeof result !== 'object') {
                          return undefined;
                        }
                        result = (result as Record<string, unknown>)[part];
                      }
                      return result;
                    } else {
                      return data[service.proxyPath];
                    }
                  })()
                : undefined;
              
              // 检查代理值
              if (proxyValue) {
                if (typeof proxyValue === 'boolean' && proxyValue) {
                  isProxy = true;
                } else if (typeof proxyValue === 'string' && proxyValue.length > 0) {
                  // 间接代理检测：如果值看起来像是代理服务器
                  const proxyValueStr = proxyValue.toLowerCase();
                  if (proxyValueStr.includes('proxy') || proxyValueStr.includes('vpn') || 
                      proxyValueStr.includes('datacenter') || proxyValueStr.includes('hosting') ||
                      proxyValueStr.includes('cloud') || proxyValueStr.includes('server') ||
                      proxyValueStr.includes('tor') || proxyValueStr.includes('anonymous') ||
                      proxyValueStr.includes('relay') || proxyValueStr.includes('gateway') ||
                      proxyValueStr.includes('cdn') || proxyValueStr.includes('cdn.') ||
                      proxyValueStr.includes('data center') || proxyValueStr.includes('datacenter')) {
                    isProxy = true;
                  }
                } else if (typeof proxyValue === 'number' && proxyValue > 0) {
                  isProxy = true;
                }
              }
            }
            
            // 3. 增强的ASN信息检查
            const asn = data['asn'] || 
                      (service.name === 'proxycheck.io' && baseIp ? (data[baseIp] as Record<string, unknown>)['asn'] : undefined) ||
                      (data['connection'] && typeof data['connection'] === 'object' ? (data['connection'] as Record<string, unknown>)['asn'] : undefined) ||
                      (data['network'] && typeof data['network'] === 'object' ? (data['network'] as Record<string, unknown>)['asn'] : undefined);
            
            if (asn) {
              const asnStr = typeof asn === 'string' ? asn.toLowerCase() : asn.toString().toLowerCase();
              if (asnStr.includes('cloud') || asnStr.includes('hosting') || asnStr.includes('datacenter') ||
                  asnStr.includes('cdn') || asnStr.includes('digital ocean') || asnStr.includes('aws') ||
                  asnStr.includes('google cloud') || asnStr.includes('microsoft azure')) {
                isProxy = true;
              }
            }
            
            // 4. 检查ISP信息，识别常见的代理ISP
            const isp = data['isp'] || 
                      (service.name === 'proxycheck.io' && baseIp ? (data[baseIp] as Record<string, unknown>)['isp'] : undefined) ||
                      (data['connection'] && typeof data['connection'] === 'object' ? (data['connection'] as Record<string, unknown>)['isp'] : undefined);
            
            if (isp && typeof isp === 'string') {
              const ispStr = isp.toLowerCase();
              const proxyIspKeywords = ['proxy', 'vpn', 'tor', 'anonymous', 'datacenter', 'hosting', 'cloud', 'cdn', 'server'];
              for (const keyword of proxyIspKeywords) {
                if (ispStr.includes(keyword)) {
                  isProxy = true;
                  break;
                }
              }
            }
            
            // 5. 检查组织信息，识别常见的云服务商
            const org = data['org'] || 
                      (service.name === 'proxycheck.io' && baseIp ? (data[baseIp] as Record<string, unknown>)['org'] : undefined) ||
                      (data['connection'] && typeof data['connection'] === 'object' ? (data['connection'] as Record<string, unknown>)['org'] : undefined);
            
            if (org && typeof org === 'string') {
              const orgStr = org.toLowerCase();
              const cloudProviders = ['amazon', 'aws', 'google', 'microsoft', 'azure', 'digitalocean', 'linode', 'vultr', 'cloudflare'];
              for (const provider of cloudProviders) {
                if (orgStr.includes(provider)) {
                  isProxy = true;
                  break;
                }
              }
            }
            
            // 6. 简单的IP格式检查（私有IP范围等）
            const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
            if (privateIpRegex.test(ipAddress)) {
              // 私有IP地址，不是公共代理
              isProxy = false;
            }
            
            // 保存结果
            results.push({
              ip: ipAddress,
              city: city,
              province: province,
              country: country,
              is_proxy: isProxy,
              service: service.name,
              trust: Number((service as Record<string, unknown>).trust) || 50,
              complete: complete
            });
            
            // 如果找到完整的结果（有城市、省份和国家信息），可以提前返回
            if (complete && service.name !== 'aws') {
              return NextResponse.json({
                ip: ipAddress,
                city: city,
                province: province,
                country: country,
                is_proxy: isProxy,
                service: service.name
              });
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        errorMessages.push(`${service.name}: ${errorMessage}`);
      }
    }
    
    // 如果收集到结果，选择最佳结果
    if (results.length > 0) {
      // 按优先级排序：1. 完整结果（有城市、省份和国家信息） 2. 可信度评分 3. 非AWS服务
      results.sort((a, b) => {
        if (a.complete && !b.complete) return -1;
        if (!a.complete && b.complete) return 1;
        if (a.trust !== b.trust) return b.trust - a.trust;
        if (a.service === 'aws') return 1;
        if (b.service === 'aws') return -1;
        return 0;
      });
      
      const bestResult = results[0];
      return NextResponse.json({
        ip: bestResult.ip,
        city: bestResult.city,
        province: bestResult.province,
        country: bestResult.country,
        is_proxy: bestResult.is_proxy,
        service: bestResult.service
      });
    }
    
    // 如果所有服务都失败，尝试获取服务器的公共IP作为最后的回退
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Fallback request timeout'));
      }, 3000);
      
      const fallbackResponse = await fetch('https://checkip.amazonaws.com/', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (fallbackResponse.ok) {
        const fallbackIp = (await fallbackResponse.text()).trim();
        return NextResponse.json({
          ip: fallbackIp,
          city: '未知城市',
          province: '未知省份',
          country: '未知国家',
          is_proxy: false,
          service: 'aws-fallback'
        });
      }
    } catch (fallbackError) {
      errorMessages.push(`Final fallback failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
    }
    
    // 如果所有服务都失败
    return NextResponse.json(
      { error: `所有IP服务都失败: ${errorMessages.join('; ')}` },
      { status: 500 }
    );
  } catch {
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
