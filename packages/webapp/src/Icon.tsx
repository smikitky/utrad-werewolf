import { FC } from 'react';

const Icon: FC<{ icon: string }> = props => {
  const { icon } = props;
  return <span className="material-icons">{icon}</span>;
};

export default Icon;
