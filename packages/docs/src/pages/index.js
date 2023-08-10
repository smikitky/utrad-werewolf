import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">
          <img
            className={styles.logo}
            src="/img/utrad-werewolf-logo.webp"
            alt={siteConfig.title}
          />
        </h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Read Docs
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/demo">
            Try Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Official docs for the UTRAD Werewolf project"
    >
      <HomepageHeader />
      <main>
        <div className={styles.main}>
          <img
            className={styles.topScreenshot}
            src="/img/screenshot-wolf.jpg"
            alt=""
          />
          <section className={styles.features}>
            {FeatureList.map((props, idx) => (
              <div className={styles.feature}>
                <h3>{props.title}</h3>
                <p>{props.description}</p>
              </div>
            ))}
          </section>
        </div>
      </main>
    </Layout>
  );
}

const FeatureList = [
  {
    title: "Fully Web-based",
    description: (
      <>
        You can play Werewolf game everywhere using your browser. No
        installation required.
      </>
    ),
  },
  {
    title: "Human-to-Human",
    description: (
      <>
        Our web UI let you play Werewolf game with human players, and you can
        use the log to train (fine-tune) your AI. The rule is based on the
        AIWolf regulation.
      </>
    ),
  },
  {
    title: "Human-to-AI",
    description: (
      <>
        You can create an NPC (bot) account that can play Werewolf game with
        human players.
      </>
    ),
  },
];
