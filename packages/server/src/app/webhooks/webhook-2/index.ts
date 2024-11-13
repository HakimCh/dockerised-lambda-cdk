import capitalize from 'lodash/capitalize';

export const handler = async () => ({
    statusCode: 200,
    body: JSON.stringify({ message: capitalize('hello world') })
});