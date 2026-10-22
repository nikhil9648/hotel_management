const RESTAURANT_LOCATION = {
  type: "Point",
  coordinates: [
    Number(process.env.RESTAURANT_LONGITUDE),
    Number(process.env.RESTAURANT_LATITUDE),
  ],
};

const DELIVERY_RADIUS_METERS =
  Number(process.env.DELIVERY_RADIUS_KM || 5) * 1000;

const isDeliveryAvailable = (customerLocation) => {
  if (
    !customerLocation ||
    customerLocation.type !== "Point" ||
    !Array.isArray(customerLocation.coordinates) ||
    customerLocation.coordinates.length !== 2
  ) {
    return false;
  }

  const [customerLng, customerLat] = customerLocation.coordinates;
  const [restaurantLng, restaurantLat] =
    RESTAURANT_LOCATION.coordinates;

  if (
    !Number.isFinite(customerLng) ||
    !Number.isFinite(customerLat) ||
    !Number.isFinite(restaurantLng) ||
    !Number.isFinite(restaurantLat) ||
    Math.abs(customerLng) > 180 ||
    Math.abs(restaurantLng) > 180 ||
    Math.abs(customerLat) > 90 ||
    Math.abs(restaurantLat) > 90
  ) {
    return false;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6371000;

  const latDifference = toRadians(customerLat - restaurantLat);
  const lngDifference = toRadians(customerLng - restaurantLng);

  const a =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(toRadians(restaurantLat)) *
      Math.cos(toRadians(customerLat)) *
      Math.sin(lngDifference / 2) ** 2;

  const distanceMeters =
    2 *
    earthRadiusMeters *
    Math.asin(Math.sqrt(Math.min(1, a)));
  const available = distanceMeters <= DELIVERY_RADIUS_METERS;

// console.log("Delivery available:", available);

return available;
};

module.exports = { isDeliveryAvailable };