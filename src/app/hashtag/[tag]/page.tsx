import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HashtagConfessionsClient from './HashtagConfessionsClient';

interface HashtagPageProps {
  params: Promise<{
    tag: string;
  }>;
}

export async function generateMetadata({ params }: HashtagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  return {
    title: `话题: #${decodedTag} - Confession Wall`,
    description: `查看话题 #${decodedTag} 下的所有表白`,
  };
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  
  if (!decodedTag || decodedTag.trim() === '') {
    notFound();
  }

  return <HashtagConfessionsClient tag={decodedTag} />;
}