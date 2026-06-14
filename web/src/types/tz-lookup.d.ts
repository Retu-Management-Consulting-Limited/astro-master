declare module "tz-lookup" {
  // Maps a coordinate to its IANA timezone id. Never throws.
  const tzlookup: (lat: number, lng: number) => string;
  export default tzlookup;
}
