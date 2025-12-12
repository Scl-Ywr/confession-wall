// 服务器端API路由，用于获取用户真实IP地址和地理位置信息
import { NextRequest, NextResponse } from 'next/server';

// 定义IP查询服务列表，支持获取城市、省份信息和代理检测
// 优化服务顺序，优先使用高精度、高可靠性的服务，增强代理检测能力
// 优先使用国内IP服务和高精度全球服务，确保返回中文结果
const ipServices = [
  // 高精度全球IP服务，提供完整的地理位置信息
  {
    url: 'https://ipinfo.io/', 
    name: 'ipinfo.io', 
    ipPath: 'ip', 
    cityPath: 'city',
    provincePath: 'region',
    countryPath: 'country',
    proxyPath: '',
    trust: 95 // 高准确率的全球IP服务
  },
  // 增加更多支持代理环境的全球IP服务
  {
    url: 'https://freeipapi.com/api/json/', 
    name: 'freeipapi.com', 
    ipPath: 'ipAddress', 
    cityPath: 'cityName',
    provincePath: 'regionName',
    countryPath: 'countryName',
    proxyPath: '',
    trust: 90 // 可靠的全球IP服务，返回完整信息
  },
  {
    url: 'https://api.ip.sb/geoip/', 
    name: 'ip.sb', 
    ipPath: 'ip', 
    cityPath: 'city', 
    provincePath: '',
    countryPath: 'country',
    proxyPath: '',
    trust: 85 // 高准确率的全球IP服务，支持中文
  },
  // 高精度国内IP服务，提供更准确的国内地址，支持中文
  // 只对中国IP使用pconline.com.cn
  {
    url: 'https://whois.pconline.com.cn/ipJson.jsp?json=true&ip=', 
    name: 'pconline.com.cn', 
    ipPath: 'ip', 
    cityPath: 'city', 
    provincePath: 'pro',
    countryPath: '', // pconline不返回country字段，我们会手动设置为中国
    proxyPath: '',
    trust: 98, // 高准确率的国内IP服务，返回中文
    lang: 'zh-CN'
  },
  // IP-only服务，作为最后的回退
  {
    url: 'https://api.ipify.org?format=json', 
    name: 'ipify.org', 
    ipPath: 'ip', 
    cityPath: '',
    provincePath: '',
    countryPath: '',
    proxyPath: '',
    trust: 99, // 只返回IP，不返回地理位置
    lang: 'en'
  },
];

// 只返回IP地址的服务，作为最后的回退
const ipOnlyServices = [
  'https://api.ipify.org?format=json',
  'https://api64.ipify.org?format=json',
  'https://jsonip.com/',
  'https://checkip.amazonaws.com/'
];

// 获取用户真实IP地址的函数
export function getUserRealIP(request: NextRequest): string | null {
  // 首先检查常见的代理头
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    // X-Forwarded-For 格式: client, proxy1, proxy2
    // 取第一个IP作为客户端真实IP
    const clientIP = forwardedFor.split(',')[0].trim();
    return clientIP;
  }
  
  // 检查X-Real-IP头
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }
  
  // 检查Cloudflare头
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // 检查Fastly头
  const fastlyClientIP = request.headers.get('Fastly-Client-IP');
  if (fastlyClientIP) {
    return fastlyClientIP;
  }
  
  // 检查Akamai头
  const trueClientIP = request.headers.get('True-Client-IP');
  if (trueClientIP) {
    return trueClientIP;
  }
  
  // 检查Vercel头
  const vercelClientIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelClientIP) {
    return vercelClientIP.split(',')[0].trim();
  }
  
  // 检查Herkou头 (使用X-Forwarded-For头，这是Heroku的标准做法)
  const herokuClientIP = request.headers.get('x-forwarded-for');
  if (herokuClientIP) {
    return herokuClientIP.split(',')[0].trim();
  }
  
  // 如果没有任何代理头，返回null
  return null;
}

// 使用IP地址获取地理位置信息的函数
async function getGeoLocation(ip: string) {
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
  
  // 尝试所有IP服务，收集结果
  for (const service of ipServices) {
    // 对于pconline.com.cn服务，只对中国IP使用
    // 检测IP是否为中国IP（1.0.0.0-239.255.255.255之间的部分IP段）
    const isChinaIp = /^(1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|10\.|11\.|12\.|13\.|14\.|15\.|16\.|17\.|18\.|19\.|20\.|21\.|22\.|23\.|24\.|25\.|26\.|27\.|28\.|29\.|30\.|31\.|32\.|33\.|34\.|35\.|36\.|37\.|38\.|39\.|40\.|41\.|42\.|43\.|44\.|45\.|46\.|47\.|48\.|49\.|50\.|51\.|52\.|53\.|54\.|55\.|56\.|57\.|58\.|59\.|60\.|61\.|62\.|63\.|64\.|65\.|66\.|67\.|68\.|69\.|70\.|71\.|72\.|73\.|74\.|75\.|76\.|77\.|78\.|79\.|80\.|81\.|82\.|83\.|84\.|85\.|86\.|87\.|88\.|89\.|90\.|91\.|92\.|93\.|94\.|95\.|96\.|97\.|98\.|99\.|100\.|101\.|102\.|103\.|104\.|105\.|106\.|107\.|108\.|109\.|110\.|111\.|112\.|113\.|114\.|115\.|116\.|117\.|118\.|119\.|120\.|121\.|122\.|123\.|124\.|125\.|126\.|127\.|128\.|129\.|130\.|131\.|132\.|133\.|134\.|135\.|136\.|137\.|138\.|139\.|140\.|141\.|142\.|143\.|144\.|145\.|146\.|147\.|148\.|149\.|150\.|151\.|152\.|153\.|154\.|155\.|156\.|157\.|158\.|159\.|160\.|161\.|162\.|163\.|164\.|165\.|166\.|167\.|168\.|169\.|170\.|171\.|172\.|173\.|174\.|175\.|176\.|177\.|178\.|179\.|180\.|181\.|182\.|183\.|184\.|185\.|186\.|187\.|188\.|189\.|190\.|191\.|192\.|193\.|194\.|195\.|196\.|197\.|198\.|199\.|200\.|201\.|202\.|203\.|204\.|205\.|206\.|207\.|208\.|209\.|210\.|211\.|212\.|213\.|214\.|215\.|216\.|217\.|218\.|219\.|220\.|221\.|222\.|223\.|224\.|225\.|226\.|227\.|228\.|229\.|230\.|231\.|232\.|233\.|234\.|235\.|236\.|237\.|238\.|239\.)/.test(ip);
    
    if (service.name === 'pconline.com.cn' && !isChinaIp) {
      // 跳过pconline.com.cn服务，对国外IP使用其他服务
      continue;
    }
    
    try {
      // 为每个服务构建带IP参数的正确URL
      let serviceUrl: string;
      
      // 为不同的服务构建不同格式的URL
      switch (service.name) {
        case 'pconline.com.cn':
          // pconline.com.cn: https://whois.pconline.com.cn/ipJson.jsp?json=true&ip=123.123.123.123
          serviceUrl = `${service.url}${ip}`;
          break;
        case 'ipinfo.io':
          // ipinfo.io: https://ipinfo.io/123.123.123.123/json
          serviceUrl = `${service.url}${ip}/json`;
          break;
        case 'freeipapi.com':
          // freeipapi.com: https://freeipapi.com/api/json/123.123.123.123
          serviceUrl = `${service.url}${ip}`;
          break;
        case 'ip.sb':
          // ip.sb: https://api.ip.sb/geoip/123.123.123.123
          serviceUrl = `${service.url}${ip}`;
          break;
        default:
          // 默认格式: https://service.com/123.123.123.123
          serviceUrl = `${service.url}${ip}`;
          break;
      }
      
      // 使用AbortController实现超时，减少超时时间
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Request timeout'));
      }, 5000); // 减少超时时间到5秒
      
      try {
        // 发送请求，添加user-agent头以模拟浏览器请求
        const response = await fetch(serviceUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          let data: Record<string, unknown> = {};
          
          try {
            // 处理pconline.com.cn的GBK编码问题
            if (service.name === 'pconline.com.cn') {
              // 获取原始二进制数据
              const buffer = await response.arrayBuffer();
              // 使用GBK解码器解码
              const decoder = new TextDecoder('gbk');
              const text = decoder.decode(buffer);
              // 移除可能的回调函数包装（如果有）
              const cleanedText = text.replace(/^jsonp\(/, '').replace(/\)$/, '');
              // 解析JSON
              data = JSON.parse(cleanedText);
            } else {
              // 其他服务直接解析JSON
              data = await response.json();
            }
          } catch (parseError) {
            console.error(`解析${service.name}响应失败:`, parseError);
            continue;
          }
          
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
          
          // 提取IP地址（应该与我们传入的一致）
          const ipAddress = getValueByPath(data, service.ipPath) as string || ip;
          
          // 跳过返回本地回环地址的服务，这是无效的
          // 处理IPv4和IPv6格式的本地回环地址
          if ((ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') && ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
            continue;
          }
          
          // 处理城市、省份和国家信息
          let city = '未知城市';
          let province = '未知省份';
          let country = '未知国家';
          
          // 特殊处理pconline.com.cn服务，手动设置国家为中国
          if (service.name === 'pconline.com.cn') {
            country = '中国';
          }
          
          if (service.cityPath) {
            const cityValue = getValueByPath(data, service.cityPath);
            if (cityValue && typeof cityValue === 'string') {
              city = cityValue;
            }
          }
          
          if (service.provincePath) {
            const provinceValue = getValueByPath(data, service.provincePath);
            if (provinceValue && typeof provinceValue === 'string') {
              province = provinceValue;
            }
          }
          
          if (service.countryPath) {
            const countryValue = getValueByPath(data, service.countryPath);
            if (countryValue && typeof countryValue === 'string') {
              country = countryValue;
              
              // 将国家代码转换为中文名称
              if (country.length === 2) {
                // 国家代码映射表（主要国家）
                const countryCodeMap: Record<string, string> = {
                  'JP': '日本',
                  'US': '美国',
                  'CN': '中国',
                  'GB': '英国',
                  'DE': '德国',
                  'FR': '法国',
                  'CA': '加拿大',
                  'AU': '澳大利亚',
                  'IT': '意大利',
                  'ES': '西班牙',
                  'RU': '俄罗斯',
                  'IN': '印度',
                  'BR': '巴西',
                  'KR': '韩国',
                  'SG': '新加坡',
                  'HK': '中国香港',
                  'TW': '中国台湾'
                };
                
                // 如果有对应的中文名称，使用中文名称
                if (countryCodeMap[country]) {
                  country = countryCodeMap[country];
                }
              }
            }
          }
          
          // 对于ipinfo.io服务，确保城市和省份不为空
          if (service.name === 'ipinfo.io') {
            // ipinfo.io返回的region就是省份/地区
            city = getValueByPath(data, 'city') as string || city;
            province = getValueByPath(data, 'region') as string || province;
          }
          
          // 标记是否有完整的地理位置信息
          const complete = city !== '未知城市' && province !== '未知省份' && country !== '未知国家';
          
          // 简单的代理检测（基于ISP和组织信息）
          let isProxy = false;
          
          // 检查ISP信息，识别常见的代理ISP
          const isp = data['isp'] || (data['connection'] && typeof data['connection'] === 'object' ? (data['connection'] as Record<string, unknown>)['isp'] : undefined);
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
          
          // 检查组织信息，识别常见的云服务商
          const org = data['org'] || (data['connection'] && typeof data['connection'] === 'object' ? (data['connection'] as Record<string, unknown>)['org'] : undefined);
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
          
          // 简单的IP格式检查（私有IP范围等）
          const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
          if (privateIpRegex.test(ipAddress)) {
            // 私有IP地址，不是公共代理
            isProxy = false;
          }
          
          // 保存结果之前检查是否为本地回环地址
          // 处理IPv4和IPv6格式的本地回环地址
          const isLoopback = ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1';
          
          if (!isLoopback) {
            // 只有非本地回环地址才保存结果
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
            if (complete) {
              return {
                ip: ipAddress,
                city: city,
                province: province,
                country: country,
                is_proxy: isProxy,
                service: service.name
              };
            }
          }
        }
      } catch (fetchError) {
        const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : '未知错误';
        errorMessages.push(`${service.name}: ${fetchErrorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      errorMessages.push(`${service.name}: ${errorMessage}`);
    }
  }
  
  // 如果收集到结果，选择最佳结果
  if (results.length > 0) {
    // 按优先级排序：1. 完整结果（有城市、省份和国家信息） 2. 可信度评分
    results.sort((a, b) => {
      if (a.complete && !b.complete) return -1;
      if (!a.complete && b.complete) return 1;
      return b.trust - a.trust;
    });
    
    const bestResult = results[0];
    return {
      ip: bestResult.ip,
      city: bestResult.city,
      province: bestResult.province,
      country: bestResult.country,
      is_proxy: bestResult.is_proxy,
      service: bestResult.service
    };
  }
  
  // 如果没有找到任何结果，尝试使用IP-only服务作为最后的回退
  for (const serviceUrl of ipOnlyServices) {
    try {
      // 使用AbortController实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Request timeout'));
      }, 10000);
      
      let ipAddress: string;
      
      if (serviceUrl === 'https://checkip.amazonaws.com/') {
        // AWS服务直接返回IP字符串
        const response = await fetch(serviceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          ipAddress = (await response.text()).trim();
          return {
            ip: ipAddress,
            city: '未知城市',
            province: '未知省份',
            country: '未知国家',
            is_proxy: false,
            service: 'ip-only-fallback'
          };
        }
      } else {
        // 其他服务返回JSON
        const response = await fetch(serviceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.ip) {
            return {
              ip: data.ip,
              city: '未知城市',
              province: '未知省份',
              country: '未知国家',
              is_proxy: false,
              service: 'ip-only-fallback'
            };
          }
        }
      }
    } catch  {
      // 继续尝试下一个服务
      continue;
    }
  }
  
  // 如果所有服务都失败，返回基本信息
  return {
    ip: ip,
    city: '未知城市',
    province: '未知省份',
    country: '未知国家',
    is_proxy: false,
    service: 'default'
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1. 获取用户真实IP地址
    let userIp = getUserRealIP(request);
    
    // 2. 检查是否为本地或私有IP
    const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.)/;
    // 检查IPv4本地地址、私有地址和IPv6本地地址
    const isLocalOrPrivate = !userIp || 
                            privateIpRegex.test(userIp) || 
                            userIp === '::1' || 
                            userIp === '::ffff:127.0.0.1' ||
                            userIp.startsWith('::ffff:10.') ||
                            userIp.startsWith('::ffff:172.16.') ||
                            userIp.startsWith('::ffff:172.17.') ||
                            userIp.startsWith('::ffff:172.18.') ||
                            userIp.startsWith('::ffff:172.19.') ||
                            userIp.startsWith('::ffff:172.20.') ||
                            userIp.startsWith('::ffff:172.21.') ||
                            userIp.startsWith('::ffff:172.22.') ||
                            userIp.startsWith('::ffff:172.23.') ||
                            userIp.startsWith('::ffff:172.24.') ||
                            userIp.startsWith('::ffff:172.25.') ||
                            userIp.startsWith('::ffff:172.26.') ||
                            userIp.startsWith('::ffff:172.27.') ||
                            userIp.startsWith('::ffff:172.28.') ||
                            userIp.startsWith('::ffff:172.29.') ||
                            userIp.startsWith('::ffff:172.30.') ||
                            userIp.startsWith('::ffff:172.31.') ||
                            userIp.startsWith('::ffff:192.168.');
    
    // 对于本地或私有IP，以及代理环境下的127.0.0.1，尝试使用外部服务获取公网IP
    if (isLocalOrPrivate) {
      // 本地开发环境或代理环境，使用外部服务获取公网IP
      try {
        // 使用多个IP服务作为回退，确保在代理环境下能获取到真实IP
        const ipServices = [
          'https://api.ipify.org?format=json',
          'https://api64.ipify.org?format=json',
          'https://jsonip.com/',
          'https://checkip.amazonaws.com/'
        ];
        
        for (const serviceUrl of ipServices) {
          try {
            // 使用AbortController实现超时，减少超时时间
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              controller.abort(new Error('Request timeout'));
            }, 3000); // 减少超时时间到3秒
            
            let ipAddress: string;
            
            if (serviceUrl === 'https://checkip.amazonaws.com/') {
              // AWS服务直接返回IP字符串
              const response = await fetch(serviceUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: controller.signal,
                keepalive: true
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                ipAddress = (await response.text()).trim();
                userIp = ipAddress;
                break; // 成功获取到IP，跳出循环
              }
            } else {
              // 其他服务返回JSON
              const response = await fetch(serviceUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: controller.signal,
                keepalive: true
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const data = await response.json();
                if (data.ip) {
                  userIp = data.ip;
                  break; // 成功获取到IP，跳出循环
                }
              }
            }
          } catch {
            // 继续尝试下一个服务
            continue;
          }
        }
      } catch (error) {
        console.error('获取公网IP失败:', error);
      }
    }
    
    if (!userIp) {
      return NextResponse.json(
        { error: '无法获取用户IP地址' },
        { status: 500 }
      );
    }
    
    // 3. 使用外部服务获取地理位置信息
    const geoLocation = await getGeoLocation(userIp);
    
    // 调试信息：返回IP地址和使用的服务
    return NextResponse.json(geoLocation);
  } catch (error) {
    console.error('获取IP信息失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
