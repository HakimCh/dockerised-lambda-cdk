import filter from 'lodash/filter';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

type User = { name: string, age: number }

const ageLimit = parseInt(process.env.AGE_LIMIT ?? "14", 10) ?? 16
const users: User[] = [
    { name: "name 1", age: 21 },
    { name: "name 2", age: 12 },
    { name: "name 3", age: 44 },
    { name: "name 4", age: 18 },
    { name: "name 5", age: 15 },
]

export const publicApiRoute = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const majorUsers = filter(users, (user: User) => user.age > ageLimit)

        return {
            statusCode: 200,
            body: JSON.stringify({ total: majorUsers.length, result: majorUsers })
        };
    } catch (err) {
        console.error('Error:', err);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};