export default {
  server: {
    hmr: false,
    ws: false,
    watch: {
      // Exclude large pack archives from file watching to avoid inotify limits
      ignored: ['**/packs/extracted/**', '**/packs/zips/**'],
    },
  },
};
