import { useState, useCallback } from 'react';
import { Detection } from '../types';

/**
 * Custom hook to manage real-time detections and persist them.
 */
export const useRealtimeDetections = () => {
  const [syncedDetections, setSyncedDetections] = useState<Detection[]>([]);

  /**
   * Simulates saving a detected pattern to Supabase/Backend.
   * In a real app, this would use supabase.from('detections').insert(...)
   */
  const saveDetection = useCallback(async (detection: Detection) => {
    // console.log('[DB Sync] Saving detection:', detection.id);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSyncedDetections(prev => [detection, ...prev]);
    return true;
  }, []);

  return {
    syncedDetections,
    saveDetection
  };
};