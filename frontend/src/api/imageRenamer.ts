const API_BASE = '/api/image-renamer';

async function getAuthHeader(): Promise<Record<string, string>> {
  const password = localStorage.getItem('web_password');
  return { 'x-password': password || '' };
}

export interface WebsiteData {
  sessionId: string;
  url: string;
  rooms: Room[];
  rawContent: string;
}

export interface Room {
  name: string;
  type: string;
}

export interface UploadedImage {
  id: string;
  originalName: string;
  savedName: string;
  path: string;
  type: string;
  preview: string;
}

export interface RenamedImage extends UploadedImage {
  suggestedName: string;
  extension: string;
}

export const imageRenamerAPI = {
  analyze: async (url: string): Promise<WebsiteData> => {
    const headers = await getAuthHeader();
    headers['Content-Type'] = 'application/json';
    
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze URL');
    }
    
    return response.json();
  },

  upload: async (sessionId: string, files: File[]): Promise<{ sessionId: string; files: { originalName: string; savedName: string; path: string; type: string }[] }> => {
    const headers = await getAuthHeader();
    
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    
    files.forEach(file => {
      formData.append('images', file);
    });
    
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload images');
    }
    
    return response.json();
  },

  rename: async (images: { originalName: string; savedName: string; path: string; type: string }[], websiteData: WebsiteData): Promise<{ results: { suggestedName: string; extension: string }[] }> => {
    const headers = await getAuthHeader();
    headers['Content-Type'] = 'application/json';
    
    const response = await fetch(`${API_BASE}/rename`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ images, websiteData })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze images');
    }
    
    return response.json();
  },

  download: async (sessionId: string, files: { savedName: string; suggestedName: string; extension: string }[]): Promise<void> => {
    const password = localStorage.getItem('web_password');
    
    const response = await fetch(`${API_BASE}/download/${sessionId}?files=${encodeURIComponent(JSON.stringify(files))}`, {
      headers: { 'x-password': password || '' }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to download');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renamed-images-${sessionId}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  cleanup: async (sessionId: string): Promise<void> => {
    const headers = await getAuthHeader();
    
    const response = await fetch(`${API_BASE}/cleanup/${sessionId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      console.error('Cleanup failed');
    }
  }
};
