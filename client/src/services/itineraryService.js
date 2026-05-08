import api from '../api';

export const generateItinerary = async (payload) => {
  const response = await api.post('/itinerary/generate', payload);
  return response.data;
};

export const downloadItineraryPdf = async ({ itinerary, tripRequest }) => {
  const response = await api.post(
    '/itinerary/pdf',
    { itinerary, tripRequest },
    { responseType: 'blob' }
  );

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `itinerary-${(itinerary?.destination || 'trip').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
