import { format } from 'date-fns';

const formatDate = (timestamp: number) => {
  return format(new Date(timestamp), 'yyyy/MM/dd HH:mm');
};

export default formatDate;
