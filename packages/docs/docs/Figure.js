import React from "react";

const Figure = ({ src, size, caption }) => {
  return (
    <figure className="figure">
      <img
        src={`/img/docs/${src}.png`}
        style={{ maxWidth: `min(100%, ${size}px)` }}
        alt="(Figure)"
      />
      {caption && <figcaption className="figure-caption">{caption}</figcaption>}
    </figure>
  );
};

export default Figure;
