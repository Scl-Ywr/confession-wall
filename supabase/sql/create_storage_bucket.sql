-- Create storage bucket for confession images
INSERT INTO storage.buckets (id, name, public) VALUES ('confession_images', 'confession_images', true);

-- Create RLS policies for the storage bucket
CREATE POLICY "Allow public read access to images" ON storage.objects
  FOR SELECT USING (bucket_id = 'confession_images');

CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'confession_images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow owner to delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'confession_images' AND
    auth.role() = 'authenticated'
  );
