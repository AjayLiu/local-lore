export function getMapboxAccessToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Mapbox access token is missing. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment.",
    );
  }
  return token;
}
