export const getRangeBand = (range: number) => {
  switch (range) {
    case 100:
      return 'Melee';
    case 250:
      return 'Short';
    case 500:
      return 'Medium';
    case 900:
      return 'Long';
    default:
      return 'Custom';
  }
};

export const formatRange = (range: number) => `${range}u`;
