'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">隐私政策</h1>
          
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold mb-4">1. 引言</h2>
            <p className="mb-4">
              欢迎使用表白墙服务。我们重视您的隐私，并致力于保护您的个人信息。本隐私政策解释了我们如何收集、使用、披露和保护您在使用我们服务时提供的信息。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">2. 我们收集的信息</h2>
            <p className="mb-4">
              我们可能收集以下类型的信息：
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>个人身份信息</strong>：包括您的姓名、邮箱地址、电话号码等</li>
              <li><strong>账户信息</strong>：包括用户名、密码、个人资料图片等</li>
              <li><strong>使用信息</strong>：包括您访问的页面、使用的功能、停留时间等</li>
              <li><strong>设备信息</strong>：包括您的IP地址、浏览器类型、设备类型、操作系统等</li>
              <li><strong>互动信息</strong>：包括您发布的内容、评论、点赞、分享等</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4">3. 我们如何使用您的信息</h2>
            <p className="mb-4">
              我们使用您的信息用于以下目的：
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>提供和维护我们的服务</li>
              <li>处理您的注册和登录请求</li>
              <li>发送服务相关的通知和更新</li>
              <li>改善我们的服务和用户体验</li>
              <li>个性化您的使用体验</li>
              <li>调查和解决问题</li>
              <li>防止欺诈和滥用</li>
              <li>遵守法律和法规要求</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4">4. 信息共享</h2>
            <p className="mb-4">
              我们不会将您的个人信息出售给第三方。我们可能会与以下方共享您的信息：
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>服务提供商</strong>：我们可能会与帮助我们提供服务的第三方共享信息，如服务器托管、数据存储、支付处理等</li>
              <li><strong>法律要求</strong>：我们可能会根据法律、法规或政府要求披露您的信息</li>
              <li><strong>保护权利</strong>：我们可能会在必要时披露您的信息，以保护我们的权利、财产或安全，或他人的权利、财产或安全</li>
              <li><strong>业务转让</strong>：如果我们进行业务合并、收购或资产出售，您的信息可能会作为业务资产的一部分被转让</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4">5. 数据安全</h2>
            <p className="mb-4">
              我们采取合理的安全措施来保护您的信息，防止未经授权的访问、使用或披露。这些措施包括：
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>加密存储和传输敏感信息</li>
              <li>访问控制和身份验证</li>
              <li>定期安全审计和更新</li>
              <li>员工培训和保密协议</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4">6. 数据保留</h2>
            <p className="mb-4">
              我们会在必要的时间内保留您的信息，以实现本隐私政策中所述的目的，或遵守法律要求。当您的信息不再需要时，我们会采取合理的措施安全地销毁或匿名化处理。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">7. 您的权利</h2>
            <p className="mb-4">
              根据适用法律，您可能享有以下权利：
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>访问您的个人信息</li>
              <li>更正或更新您的个人信息</li>
              <li>删除您的个人信息</li>
              <li>限制或反对我们处理您的信息</li>
              <li>数据可携带权</li>
              <li>撤回同意</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4">8. 第三方链接</h2>
            <p className="mb-4">
              我们的服务可能包含指向第三方网站或服务的链接。本隐私政策不适用于这些第三方网站或服务，我们建议您阅读它们的隐私政策。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">9. 儿童隐私</h2>
            <p className="mb-4">
              我们的服务不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。如果我们发现我们收集了13岁以下儿童的信息，我们会立即删除这些信息。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">10. 隐私政策变更</h2>
            <p className="mb-4">
              我们可能会不时更新本隐私政策。我们将在服务上发布变更通知，并在变更生效前给予合理的通知期。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">11. 联系方式</h2>
            <p className="mb-4">
              如有任何关于本隐私政策的问题，请通过我们的联系页面与我们联系。
            </p>
            
            <div className="mt-12 text-gray-500 dark:text-gray-400 text-sm">
              <p>最后更新日期：{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PrivacyPage;