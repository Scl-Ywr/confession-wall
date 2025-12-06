import { confessionService } from './confessionService';
import { supabase } from '@/lib/supabase/client';

// Mock supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockResolvedValue({ error: null }),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      rpc: jest.fn().mockResolvedValue({ error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockResolvedValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
      })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      remove: jest.fn(),
    })),
  },
}));

describe('confessionService', () => {
  describe('toggleLike', () => {
    it('should call rpc function with correct parameters', async () => {
      // Arrange
      const confessionId = 'test-confession-id';
      const userId = 'test-user-id';
      
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: userId } },
      });
      
      // Act
      await confessionService.toggleLike(confessionId);
      
      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('toggle_like', {
        p_confession_id: confessionId,
        p_user_id: userId,
      });
    });
    
    it('should throw error if user is not authenticated', async () => {
      // Arrange
      const confessionId = 'test-confession-id';
      
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });
      
      // Act & Assert
      await expect(confessionService.toggleLike(confessionId)).rejects.toThrow('User not authenticated');
    });
  });
  
  describe('likeConfession', () => {
    it('should insert like record with correct parameters', async () => {
      // Arrange
      const confessionId = 'test-confession-id';
      const userId = 'test-user-id';
      
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: userId } },
      });
      
      const mockInsert = jest.fn().mockReturnThis().mockResolvedValue({ error: null });
      const mockFrom = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: mockInsert,
        delete: jest.fn().mockReturnThis().mockResolvedValue({ error: null }),
      }));
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);
      
      // Act
      await confessionService.likeConfession(confessionId);
      
      // Assert
      expect(mockInsert).toHaveBeenCalledWith({
        confession_id: confessionId,
        user_id: userId,
      });
    });
  });
  
  describe('unlikeConfession', () => {
    it('should delete like record with correct parameters', async () => {
      // Arrange
      const confessionId = 'test-confession-id';
      const userId = 'test-user-id';
      
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: userId } },
      });
      
      const mockDelete = jest.fn().mockReturnThis().mockResolvedValue({ error: null });
      const mockFrom = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis().mockResolvedValue({ error: null }),
        delete: mockDelete,
      }));
      
      (supabase.from as jest.Mock).mockImplementation(mockFrom);
      
      // Act
      await confessionService.unlikeConfession(confessionId);
      
      // Assert
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
