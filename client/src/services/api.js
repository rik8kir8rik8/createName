const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const generateStoryboard = async (text, useMockAI = false, pageCount = 8) => {
  const response = await fetch(`${API_BASE_URL}/generate-storyboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, useMockAI, pageCount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate storyboard');
  }

  return await response.json();
};

export const getContextData = async (type = null) => {
  const url = type ? `${API_BASE_URL}/context?type=${type}` : `${API_BASE_URL}/context`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch context data');
  }

  return await response.json();
};

export const searchContext = async (condition) => {
  const response = await fetch(`${API_BASE_URL}/context/search?condition=${encodeURIComponent(condition)}`);

  if (!response.ok) {
    throw new Error('Failed to search context');
  }

  return await response.json();
};

export const generatePageImages = async (storyboard) => {
  const response = await fetch(`${API_BASE_URL}/generate-page-images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ storyboard }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate page images');
  }

  return await response.json();
};

export const reloadContext = async () => {
  const response = await fetch(`${API_BASE_URL}/reload-context`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to reload context');
  }

  return await response.json();
};