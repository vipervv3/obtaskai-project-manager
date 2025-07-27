import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Proxy endpoint for fetching iCal feeds to avoid CORS issues
router.post('/proxy-ical', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { feedUrl } = req.body;
    
    if (!feedUrl) {
      return res.status(400).json({ error: 'Feed URL is required' });
    }

    // Validate URL
    try {
      new URL(feedUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log('Proxying iCal feed request for:', feedUrl);
    
    // Fetch the iCal feed
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'ObtaskAI Calendar Integration 1.0',
        'Accept': 'text/calendar, application/ics, text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const icalData = await response.text();
    
    // Check if the response is actually iCal data
    if (!icalData.includes('BEGIN:VCALENDAR') || contentType?.includes('text/html')) {
      throw new Error('The URL returned HTML instead of calendar data. Please ensure you are using the public ICS link from Outlook\'s "Published calendars" section.');
    }
    
    // Return the raw iCal data
    res.json({
      success: true,
      data: icalData,
      contentType: contentType,
      lastModified: response.headers.get('last-modified'),
    });
    
  } catch (error: any) {
    console.error('Error proxying iCal feed:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendar feed',
      details: error.message 
    });
  }
});

// Get cached calendar events
router.get('/external-events', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // This would typically fetch from a database cache
    // For now, return empty array as the caching is done client-side
    res.json({
      success: true,
      data: [],
      message: 'External events are cached client-side'
    });
  } catch (error: any) {
    console.error('Error fetching external events:', error);
    res.status(500).json({ error: 'Failed to fetch external events' });
  }
});

export default router;