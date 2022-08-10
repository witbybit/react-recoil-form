module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|md|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  typescript: {
    check: true, // type-check stories during Storybook build
  },
  framework: '@storybook/react',
  core: {
    builder: '@storybook/builder-vite',
  },
};
