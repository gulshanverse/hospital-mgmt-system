export const ENV = {
  appId: process.env.VITE_APP_ID || "TtabevBoN3F2YUrkXpbqCr",
  cookieSecret: process.env.JWT_SECRET || "VUdBHsBe3fApsysmah4myC",
  databaseUrl: process.env.DATABASE_URL || "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || "https://api.manus.im",
  ownerOpenId: process.env.OWNER_OPEN_ID || "66JQM2vpWM2RMzUrNPkD5Y",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || "eEHAGxFDw7TxNqqEs4uHGb",
};
