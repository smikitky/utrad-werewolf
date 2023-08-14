// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "UTRAD Werewolf",
  tagline: "Werewolf Game UI for Your Research",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://utrad-werewolf-docs.netlify.app/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "facebook", // Usually your GitHub org/user name.
  projectName: "docusaurus", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: ["docusaurus-plugin-sass"],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/smikitky/utrad-werewolf",
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.scss"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/werewolf-social-card.jpg",
      navbar: {
        title: "UTRAD Werewolf",
        logo: {
          alt: "",
          src: "img/werewolf-brand.jpg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "tutorialSidebar",
            position: "left",
            label: "Docs",
          },
          {
            to: "docs/demo",
            position: "left",
            label: "Demo",
          },
          // {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: "https://github.com/smikitky/utrad-werewolf",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Home",
                to: "/docs/intro",
              },
              {
                label: "Online Demo",
                to: "/docs/demo",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/smikitky/utrad-werewolf",
              },
              {
                label: "GitHub Issues",
                href: "https://github.com/smikitky/utrad-werewolf/issues",
              },
              {
                label: "GitHub Discussions",
                href: "https://github.com/smikitky/utrad-werewolf/discussions",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} UTRAD-ICAL, Soichiro Miki. Built with Docusaurus and hosted by Netlify.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
