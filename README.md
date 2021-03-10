# Genkan 玄関

Genkan is a session based authentication system written in NodeJS and uses MongoDB as its database.

> ### ⚠️ Don't implement Genkan in any production environment (just yet!)
> This project is still heavily in development. It is highly and extremely discouraged to use Genkan in any production environment.

## Why use Genkan

Genkan is made to be easily implementable across any Node application regardless of scale. A Node application can simply check for the browser cookie against the session ID stored in MongoDB to check for login state.

