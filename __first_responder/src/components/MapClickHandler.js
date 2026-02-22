import { useMapEvents } from 'react-leaflet';

const MapClickHandler = ({ isBuilding, onMapClick }) => {
  useMapEvents({
    click(e) {
      if (isBuilding) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

export default MapClickHandler;