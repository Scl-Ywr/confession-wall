import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryConfessionsClient from './CategoryConfessionsClient';

interface CategoryPageProps {
  params: Promise<{
    categoryId: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categoryId } = await params;
  return {
    title: `分类 ${categoryId} - Confession Wall`,
    description: `查看分类 ${categoryId} 下的所有表白`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  
  if (!categoryId || categoryId.trim() === '') {
    notFound();
  }

  return <CategoryConfessionsClient categoryId={categoryId} />;
}