type Message = string | ((...args: any[]) => string)

type ObjectNotFoundOptions = {
    name: string
    value: string | number
    property?: string
}

type DuplicateObjectOptions = {
    name: string
    value: string | number
    property?: string
}

export const messagesHelper = {
    OBJECT_NOT_FOUND: ({ name, value, property = "id" }: ObjectNotFoundOptions) =>
        `The object '${name}' with ${property} '${value}' was not found in the database!`,
    OBJECT_ALREADY_EXISTS: ({ name, value, property = "id" }: DuplicateObjectOptions) =>
        `An object '${name}' with ${property} '${value}' already exists in the database!`,
    UNAUTHORIZED_USER: "Unauthorized user!",
    REQUEST_WITHOUT_AUTHORIZATION_TOKEN:
        "The request did not send any authorization token! Provide a token to access protected routes!",
    INVALID_AUTHORIZATION_TOKEN: "This authorization token is invalid for some reason! Try renewing it or try again!",
    INVALID_CREDENTIALS: "Invalid email or password!",
    RESOURCE_ID_NOT_PROVIDED: "The resource ID was not provided in the request.",
    RESOURCE_NOT_FOUND: "The requested resource was not found.",
    RESOURCE_ACCESS_UNAUTHORIZED: "You are not authorized to access this resource.",
    CANNOT_DELETE_SELF: "You cannot delete yourself!",
    INVALID_API_KEY: "Invalid API key!",
} satisfies Record<string, Message>
