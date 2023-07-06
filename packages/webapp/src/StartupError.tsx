import { FC } from 'react';
import Alert from './Alert ';

const StartupErrror: FC<{ undefinedEnvs: string[] }> = props => {
  const { undefinedEnvs } = props;
  return (
    <Alert>
      <div>
        <p>
          <b>Missing environment variables.</b> We could not start the app
          because the following environment variables are not set:
        </p>
        <ul className="bullet">
          {undefinedEnvs.map(env => (
            <li key={env}>{env}</li>
          ))}
        </ul>
        <p>
          Please set them in Netlify Dashboard. (Or if you are running the app
          locally, set them in <code>.env</code> file.)
        </p>
      </div>
    </Alert>
  );
};

export default StartupErrror;
