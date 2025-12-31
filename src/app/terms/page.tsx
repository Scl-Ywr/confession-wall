'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';

const TermsPage: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">服务条款</h1>
          
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold mb-4">1. 接受条款</h2>
            <p className="mb-4">
              欢迎使用表白墙服务。通过访问或使用我们的服务，您同意遵守以下服务条款和条件（&ldquo;条款&rdquo;）。请仔细阅读这些条款。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">2. 服务说明</h2>
            <p className="mb-4">
              表白墙是一个允许用户发布、查看和互动表白内容的平台。我们保留随时修改或终止服务的权利，无需提前通知。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">3. 用户行为</h2>
            <p className="mb-4">
              您同意在使用服务时遵守所有适用的法律法规，并不得：
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>发布任何违法、诽谤、淫秽或侵犯他人权利的内容</li>
              <li>骚扰或威胁其他用户</li>
              <li>尝试未经授权访问我们的系统或服务</li>
              <li>使用自动化工具收集数据</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4">4. 知识产权</h2>
            <p className="mb-4">
              服务中提供的所有内容，包括但不限于文本、图像、视频和软件，均受版权和其他知识产权法律的保护。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">5. 隐私政策</h2>
            <p className="mb-4">
              我们的隐私政策解释了我们如何收集、使用和保护您的个人信息。使用我们的服务即表示您同意我们按照隐私政策处理您的信息。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">6. 免责声明</h2>
            <p className="mb-4">
              服务按&quot;原样&quot;提供，我们不保证服务的准确性、可靠性或可用性。我们不对任何因使用或无法使用服务而导致的损失负责。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">7. 终止</h2>
            <p className="mb-4">
              我们保留在任何时候终止或暂停您访问服务的权利，无需提前通知，原因包括但不限于违反这些条款。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">8. 条款变更</h2>
            <p className="mb-4">
              我们可能会不时更新这些条款。我们将在服务上发布变更通知，并在变更生效前给予合理的通知期。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">9. 法律适用</h2>
            <p className="mb-4">
              这些条款受中华人民共和国法律管辖，任何争议将提交至有管辖权的法院解决。
            </p>
            
            <h2 className="text-xl font-semibold mb-4">10. 联系方式</h2>
            <p className="mb-4">
              如有任何关于这些条款的问题，请通过我们的联系页面与我们联系。
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

export default TermsPage;