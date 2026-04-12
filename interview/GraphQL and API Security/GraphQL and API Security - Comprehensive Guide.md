# GraphQL and API Security — Comprehensive Guide

## Introduction

GraphQL is a query language and runtime for APIs developed internally at Facebook in 2012 and open-sourced in 2015. It gives clients the power to request exactly the data they need through a single endpoint, replacing the resource-oriented URL structure of REST with a schema-driven, type-safe contract between client and server. That flexibility accelerates product development but introduces security challenges that are fundamentally different from traditional REST APIs.

In a REST API, the attack surface is defined by the set of routes and HTTP methods. Securing REST means locking down each endpoint with middleware, validating inputs at known boundaries, and rate-limiting per URL. In GraphQL, the attack surface is defined by the **schema** — a graph of interconnected types, fields, and resolvers — and the nearly unbounded set of queries a client can construct against it. A single GraphQL endpoint can service queries of wildly different cost, depth, and authorization requirements, all via `POST /graphql`.

This guide covers the security properties unique to GraphQL, the failure modes that arise from its flexibility, and the operational controls that make it safe to run in production.

---

## GraphQL Fundamentals Refresher

### Schema and Type System

A GraphQL schema is the contract between client and server. It defines every type, field, relationship, and operation the API supports using the Schema Definition Language (SDL):

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  orders(first: Int, after: String): OrderConnection!
  organization: Organization!
}

type Organization {
  id: ID!
  name: String!
  members: [User!]!
  billingInfo: BillingInfo
}

enum Role {
  ADMIN
  MEMBER
  VIEWER
}

type Query {
  me: User!
  user(id: ID!): User
  users(filter: UserFilter): [User!]!
}

type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

type Subscription {
  orderStatusChanged(orderId: ID!): Order!
}
```

The schema is simultaneously the API documentation, the type-checking system, and the attack surface map. Every type and field an attacker can reach is defined here, and the relationships between types determine the traversal paths available for nested attacks.

### Resolvers

Each field in the schema is backed by a **resolver** — a function that fetches or computes the field's value. Resolvers are where the actual data access, business logic, and authorization decisions happen:

```javascript
const resolvers = {
  Query: {
    user: (parent, { id }, context) => {
      return context.dataSources.userAPI.getUser(id);
    },
  },
  User: {
    orders: (user, { first, after }, context) => {
      return context.dataSources.orderAPI.getOrdersForUser(user.id, { first, after });
    },
    organization: (user, args, context) => {
      return context.dataSources.orgAPI.getOrg(user.organizationId);
    },
  },
};
```

Each resolver call is a potential database query, service call, or compute operation. The client controls which resolvers fire by choosing which fields to include in the query. This is the root of GraphQL's performance and security complexity: the server does not know the cost of a query until it parses and analyzes it.

### Queries, Mutations, and Subscriptions

- **Queries** are read operations. They can nest arbitrarily deep following the type graph.
- **Mutations** are write operations. They execute sequentially (unlike queries, which can run in parallel), but can still return nested types that trigger resolver chains.
- **Subscriptions** open a persistent connection (typically WebSocket) for real-time data. They maintain server-side state and consume resources for the lifetime of the subscription.

### Execution Model

When a GraphQL server receives an operation, it:

1. **Parses** the query string into an AST (Abstract Syntax Tree).
2. **Validates** the AST against the schema (type checking, field existence, argument types).
3. **Executes** the operation by walking the AST and calling resolvers breadth-first, level by level.
4. **Serializes** the result into the response shape matching the query.

Security controls can be inserted at any of these phases: static analysis before execution (depth limits, complexity scoring), middleware wrapping resolvers (authorization), and post-execution filtering (field-level redaction).

---

## Introspection Attacks

### What Introspection Exposes

GraphQL introspection is a built-in capability defined in the specification that allows clients to query the schema itself. The `__schema` and `__type` meta-fields return the complete type system:

```graphql
query IntrospectionQuery {
  __schema {
    types {
      name
      kind
      fields {
        name
        type {
          name
          kind
          ofType {
            name
          }
        }
        args {
          name
          type { name }
        }
      }
    }
    mutationType {
      fields {
        name
        args { name type { name } }
      }
    }
  }
}
```

This query returns every type, field, argument, enum value, and relationship in the API. For an attacker, it is the equivalent of obtaining the complete API documentation, database schema hints, and relationship map in a single request. They can identify sensitive fields (`ssn`, `billingInfo`, `internalNotes`), discover mutations (`deleteUser`, `promoteToAdmin`, `transferFunds`), and map traversal paths for IDOR attacks.

### Attack Scenarios

**Schema reconnaissance:** An attacker runs the full introspection query to map the API surface before probing for authorization gaps. Tools like GraphQL Voyager visualize the schema as an interactive graph, making it trivial to identify high-value targets.

**Discovering hidden functionality:** Even when a frontend client only uses a subset of the schema, introspection reveals all available operations. Internal admin mutations, deprecated but still-active fields, and experimental features are all visible.

**Identifying input types for injection:** Introspection reveals argument types and input objects, helping an attacker craft malformed inputs targeting specific resolvers.

### Mitigations

**Disable introspection in production:** Most GraphQL servers support this as a configuration option. Apollo Server disables it by default in production mode. For custom servers, reject queries containing `__schema` or `__type` at the validation layer.

**Authenticated introspection:** Instead of fully disabling, restrict introspection to authenticated users with specific roles. This preserves developer tooling for internal users while blocking unauthenticated reconnaissance.

**Schema registry / CI publishing:** Publish the schema through CI/CD to internal documentation tools, developer portals, or schema registries (Apollo Studio, GraphQL Hive) instead of relying on runtime introspection.

**Field suggestion suppression:** Even with introspection disabled, GraphQL servers often return error messages like `Did you mean "email"?` when an invalid field is queried. These suggestions leak valid field names. Configure the server to suppress field suggestions in production, or replace them with generic error messages.

```javascript
const server = new ApolloServer({
  introspection: false,
  formatError: (error) => {
    if (error.message.startsWith('Cannot query field')) {
      return new Error('Invalid field');
    }
    return error;
  },
});
```

---

## Query Complexity and Denial of Service

### The Depth Problem

GraphQL allows clients to construct queries of arbitrary depth by following type relationships. A schema with circular references (which is common — users have organizations, organizations have members who are users) enables unbounded nesting:

```graphql
query DeepNesting {
  user(id: "1") {
    organization {
      members {
        organization {
          members {
            organization {
              members {
                # ... continue indefinitely
                name
              }
            }
          }
        }
      }
    }
  }
}
```

Each level of nesting triggers a new set of resolver calls and database queries. A depth of 10 levels on a type graph with fan-out could trigger millions of resolver calls from a single HTTP request.

### Depth Limiting

The simplest defense is a hard limit on query depth. Libraries like `graphql-depth-limit` reject queries exceeding a configured maximum before execution:

```javascript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  validationRules: [depthLimit(10)],
});
```

Depth limiting is easy to implement but coarse. A query at depth 5 selecting 100 fields per level is far more expensive than a query at depth 15 selecting one field per level. Depth limits should be combined with cost analysis.

### Cost Analysis and Complexity Scoring

Cost analysis assigns a numeric weight to each field and computes the total cost of a query before execution. If the cost exceeds a threshold, the query is rejected.

**Field-level cost annotations:**

```javascript
const typeDefs = gql`
  type Query {
    users(first: Int): [User!]! @cost(complexity: 10, multipliers: ["first"])
    user(id: ID!): User @cost(complexity: 1)
  }

  type User {
    id: ID! @cost(complexity: 0)
    email: String! @cost(complexity: 0)
    orders(first: Int): [Order!]! @cost(complexity: 5, multipliers: ["first"])
    recommendations: [Product!]! @cost(complexity: 50)
  }
`;
```

**Cost calculation algorithm:**

The total cost is computed recursively. For a field with a list multiplier, the cost of its children is multiplied by the expected list size:

```
cost(field) = fieldCost + (multiplier × sum(cost(child) for each child field))
```

For example, `users(first: 100) { orders(first: 50) { items { name } } }` would compute as:
- `items.name`: 0
- `items`: 0 + (1 × 0) = 0
- `orders`: 5 + (50 × 0) = 5
- `users`: 10 + (100 × 5) = 510

The `graphql-query-complexity` library implements this pattern and integrates with Apollo Server and other frameworks.

**Tuning thresholds:** Setting cost thresholds requires analyzing real production query patterns. Start with permissive limits, log query costs, identify the p95 and p99 costs of legitimate queries, and set the threshold above the p99 with a reasonable margin. Too tight and you break legitimate clients; too loose and you allow abuse.

### Timeout and Resource Guards

Cost analysis operates before execution. Runtime guards protect against queries that pass static analysis but still consume excessive resources:

- **Resolver-level timeouts:** Kill individual resolver calls that exceed a duration threshold.
- **Operation-level timeouts:** Kill the entire operation if total execution time exceeds a limit (e.g., 30 seconds).
- **Connection pool limits:** Bound the number of concurrent database connections a single operation can consume.
- **DataLoader batching:** Use DataLoader to batch and deduplicate resolver calls within a single execution tick, preventing the N+1 query problem from amplifying into a DoS vector.

```javascript
const userLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findByIds(userIds);
  return userIds.map(id => users.find(u => u.id === id));
});
```

---

## Batching and Alias Abuse

### How Batching Works

GraphQL servers commonly accept an array of operations in a single HTTP request:

```json
[
  { "query": "mutation { login(user: \"admin\", pass: \"password1\") { token } }" },
  { "query": "mutation { login(user: \"admin\", pass: \"password2\") { token } }" },
  { "query": "mutation { login(user: \"admin\", pass: \"password3\") { token } }" }
]
```

An attacker can pack hundreds or thousands of operations into a single HTTP request, bypassing per-request rate limits while generating massive server-side load. A batch of 1,000 login mutations is one HTTP request but 1,000 authentication attempts.

### Alias Abuse

Even without array batching, GraphQL aliases allow repeating the same field or operation under different names within a single query:

```graphql
query BruteForce {
  a1: login(user: "admin", pass: "password1") { token }
  a2: login(user: "admin", pass: "password2") { token }
  a3: login(user: "admin", pass: "password3") { token }
  # ... hundreds more aliases
  a500: login(user: "admin", pass: "password500") { token }
}
```

This is a single GraphQL operation containing 500 resolver calls. Each alias invokes the `login` resolver independently. Traditional rate limiting sees one HTTP request. Even query complexity analysis may undercount if aliases are not properly accounted for.

**Resource amplification example:**

```graphql
query Amplify {
  a1: expensiveSearch(query: "a") { results { details { relatedItems { name } } } }
  a2: expensiveSearch(query: "b") { results { details { relatedItems { name } } } }
  a3: expensiveSearch(query: "c") { results { details { relatedItems { name } } } }
  # 50 aliases × expensive search × nested resolution = massive backend load
}
```

### Mitigations

**Limit batch size:** Cap the number of operations per HTTP request (e.g., maximum 5 or 10). Reject requests exceeding the limit.

**Count aliases in cost analysis:** Ensure the complexity scoring system treats each alias as a separate invocation. The cost of `a1: login(...) a2: login(...)` should be 2× the cost of a single `login(...)`.

**Operation-aware rate limiting:** Rate limit by operation name, mutation type, or resolved field rather than HTTP request count. If the `login` mutation is called 500 times via aliases, count it as 500 authentication attempts.

**Disable unnecessary batching:** If your clients don't need array batching, disable it entirely. Many servers enable it by default.

---

## Authorization Patterns

### The Core Problem

GraphQL has no built-in authorization model. The specification defines type checking and execution semantics but says nothing about who can access what. Authorization is entirely the responsibility of the application layer. This is by design — but it means every GraphQL API must consciously implement authorization, and the graph structure creates authorization challenges that don't exist in REST.

In REST, authorization is typically enforced at the route/controller level: the `/admin/users` endpoint checks for admin role, and all fields returned by that endpoint inherit the same authorization. In GraphQL, a single query can traverse from a public type to a sensitive one through a chain of relationships:

```graphql
query {
  publicPost(id: "123") {        # Public — anyone can access
    author {                      # User type — some fields restricted
      email                       # Should be restricted to the user themselves or admins
      organization {              # Organization type — different authorization domain
        billingInfo {              # Highly sensitive — only billing admins
          creditCardLast4
        }
      }
    }
  }
}
```

If authorization is only checked at the query entry point (`publicPost`), the traversal to `billingInfo` is unauthorized but succeeds because the resolver trusts the parent context.

### Schema Directives

Custom directives annotate the schema with authorization requirements, making the policy visible and declarative:

```graphql
directive @auth(requires: Role!) on FIELD_DEFINITION | OBJECT

type User {
  id: ID!
  name: String!
  email: String! @auth(requires: SELF_OR_ADMIN)
  ssn: String @auth(requires: ADMIN)
}

type BillingInfo @auth(requires: BILLING_ADMIN) {
  creditCardLast4: String
  invoices: [Invoice!]!
}

type Mutation {
  deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
  updateOrgSettings(input: OrgInput!): Organization! @auth(requires: ORG_ADMIN)
}
```

Directives are resolved at the schema level and can be implemented as field middleware that wraps the original resolver. The advantage is that authorization rules are co-located with the schema definition and visible in schema reviews.

### Middleware and Resolver-Level Checks

**Middleware approach (graphql-shield):**

`graphql-shield` provides a rules engine that maps authorization logic to the type graph:

```javascript
import { shield, rule, and, or } from 'graphql-shield';

const isAuthenticated = rule()((parent, args, ctx) => ctx.user !== null);
const isAdmin = rule()((parent, args, ctx) => ctx.user?.role === 'ADMIN');
const isOwner = rule()((parent, args, ctx, info) => ctx.user?.id === parent.id);

const permissions = shield({
  Query: {
    user: isAuthenticated,
    users: and(isAuthenticated, isAdmin),
  },
  User: {
    email: or(isOwner, isAdmin),
    ssn: isAdmin,
  },
  Mutation: {
    deleteUser: isAdmin,
    updateUser: or(isOwner, isAdmin),
  },
}, {
  fallbackRule: isAuthenticated,
  allowExternalErrors: false,
});
```

The `shield` middleware intercepts resolver execution and evaluates rules before the resolver runs. The `fallbackRule` option provides deny-by-default behavior.

**Resolver-level checks:**

For fine-grained, instance-specific authorization (e.g., "can this user access this specific resource?"), checks must happen inside the resolver with access to the resolved data:

```javascript
const resolvers = {
  Query: {
    order: async (parent, { id }, context) => {
      const order = await context.dataSources.orderAPI.getOrder(id);
      if (order.userId !== context.user.id && context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Not authorized to view this order');
      }
      return order;
    },
  },
};
```

### Policy Engines (OPA, Cedar)

For complex authorization requirements, external policy engines provide centralized, auditable policy management:

- **Open Policy Agent (OPA):** Policies written in Rego, evaluated against a JSON input (user, resource, action). The GraphQL middleware sends an authorization query to OPA before each resolver executes.
- **AWS Cedar:** A policy language designed for fine-grained authorization with built-in support for hierarchical resources, which maps well to GraphQL's type graph.

The advantage of external policy engines is separation of authorization logic from business logic, centralized policy management, audit logging, and the ability to test policies independently.

### Deny-by-Default

The safest pattern is to deny access to all fields by default and explicitly grant access. This inverts the common failure mode where new fields are accidentally exposed because authorization was forgotten:

```javascript
const permissions = shield({
  Query: {
    publicPosts: allow,          // Explicitly public
    me: isAuthenticated,         // Authenticated users only
    users: isAdmin,              // Admin only
  },
}, {
  fallbackRule: deny,            // Everything else is denied
});
```

When a developer adds a new field or type, it is inaccessible until an authorization rule is explicitly added. This creates a forcing function for security review.

---

## BOLA/IDOR in GraphQL

### Why GraphQL Makes IDOR Worse

Broken Object-Level Authorization (BOLA) / Insecure Direct Object Reference (IDOR) is the #1 API security risk (OWASP API Security Top 10). GraphQL amplifies IDOR risk in several ways:

**Global Relay IDs:** The Relay specification encourages globally unique, base64-encoded IDs like `dXNlcjoxMjM=` (decodes to `user:123`). While convenient for client-side caching, they make ID enumeration trivial — decoding reveals the type and sequential numeric ID.

**Predictable IDs:** Even without Relay, many GraphQL APIs use autoincrement database IDs as the `ID` scalar. Querying `user(id: "1")`, `user(id: "2")`, `user(id: "3")` is straightforward enumeration.

**Nested object traversal:** The graph structure allows reaching objects through multiple paths. Even if `user(id: "456")` is properly authorized, an attacker might reach the same user through an unprotected path:

```graphql
query {
  organization(id: "1") {
    members {
      # Returns all users in the org, including user 456
      email
      ssn
    }
  }
}
```

**Node interface:** The common `node(id: ID!)` query pattern accepts any global ID and returns any type. If authorization is not enforced at the type level, `node(id: "dXNlcjoxMjM=")` returns user 123 regardless of who is asking:

```graphql
query {
  node(id: "dXNlcjoxMjM=") {
    ... on User { email ssn }
    ... on Order { total items { name } }
    ... on BillingInfo { creditCardLast4 }
  }
}
```

### Defense Patterns

**Authorization at the data-fetching layer:** Enforce ownership/tenant checks where data is loaded, not just at the query entry point. Every resolver that fetches a resource by ID must verify the requesting user has access:

```javascript
class UserAPI extends DataSource {
  async getUser(id, requestingUser) {
    const user = await this.db.users.findById(id);
    if (!user) return null;
    if (user.organizationId !== requestingUser.organizationId && requestingUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Access denied');
    }
    return user;
  }
}
```

**Use opaque, non-sequential IDs:** UUIDs or cryptographically random identifiers prevent enumeration. Even with Relay-style global IDs, the underlying identifier should be a UUID, not an autoincrement integer.

**Scope all queries by tenant:** Instead of fetching by global ID, scope queries to the authenticated user's tenant:

```javascript
const resolvers = {
  Query: {
    users: (parent, args, context) => {
      return context.dataSources.userAPI.getUsersByOrg(context.user.organizationId, args);
    },
  },
};
```

**Automated IDOR testing:** Write integration tests that authenticate as User A and attempt to access User B's resources through every query path, including nested traversals. Test both direct ID access and indirect access through relationships.

---

## Rate Limiting for GraphQL

### Why Per-Request Rate Limiting Fails

Traditional API rate limiting counts HTTP requests per IP or per API key. In GraphQL, this is nearly useless because:

- One HTTP request can contain a batch of 100 operations.
- One operation can use aliases to invoke 500 resolvers.
- Two operations with identical HTTP characteristics can differ by 1000× in server-side cost.
- A query requesting `{ users { name } }` and a query requesting `{ users { orders { items { reviews { author { orders { ... } } } } } } }` are both one HTTP POST to `/graphql`.

### Operation-Aware Rate Limiting

Effective GraphQL rate limiting must understand the operation being executed:

**Cost-based rate limiting:** Assign each client a "cost budget" per time window. Each query consumes budget proportional to its computed complexity score. A simple `{ me { name } }` might cost 1 point, while a complex nested query might cost 500 points. The client's budget is decremented by the query's cost, not by 1.

```
Rate limit: 10,000 cost points per minute per API key

Query: { me { name } }           → cost: 1    → budget remaining: 9,999
Query: { users(first: 100) { orders { items { name } } } } → cost: 800 → budget remaining: 9,199
```

**Operation-name-based limiting:** Rate limit specific operations independently. The `login` mutation gets a strict limit (5 per minute), while `getProfile` gets a generous one (100 per minute). This requires operations to be named, which is a best practice regardless.

**Tenant and user-level quotas:** Apply different rate limits based on the authenticated user's plan tier, organization, or role. Admins performing bulk operations may need higher limits than regular users.

**Field-specific rate limiting:** Certain expensive or sensitive fields (e.g., `search`, `export`, `recommendations`) can have their own rate limits independent of the overall query budget.

### Implementation Patterns

```javascript
import { createComplexityPlugin } from 'graphql-query-complexity';

const complexityPlugin = createComplexityPlugin({
  maximumComplexity: 1000,
  estimators: [
    fieldExtensionsEstimator(),
    simpleEstimator({ defaultComplexity: 1 }),
  ],
  onComplete: (complexity) => {
    console.log(`Query complexity: ${complexity}`);
  },
  createError: (max, actual) => {
    return new GraphQLError(
      `Query too complex: ${actual}. Maximum allowed: ${max}.`
    );
  },
});
```

For cost-based rate limiting across requests, use a token bucket or sliding window algorithm keyed on the authenticated user, with the query's complexity score as the cost per request rather than a flat cost of 1.

---

## Persisted Queries and Allowlisted Operations

### What Persisted Queries Are

Persisted queries replace arbitrary query strings with pre-registered query hashes or IDs. Instead of sending the full query text, the client sends a hash:

```json
{
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "ecf4edb46db40b5132295c0291d62fb65d6759a9ced9853c6e5a6cba4ee3"
    }
  },
  "variables": { "id": "123" }
}
```

The server looks up the hash in a registry and executes the corresponding query. If the hash is not found, the server either rejects the request (strict mode) or asks the client to send the full query for registration (automatic persisted queries / APQ).

### Security Benefits

**Elimination of arbitrary queries:** In strict mode, the server only executes queries that were explicitly registered during the build/deploy process. Attackers cannot craft novel queries for introspection, depth attacks, or alias abuse because the server rejects any query not in the allowlist.

**Query complexity is known at registration time:** Since every allowed query is pre-analyzed, the server knows the maximum cost of any operation before execution. There are no surprises.

**Reduced attack surface:** Persisted queries effectively convert a flexible GraphQL API into a fixed set of operations, similar to REST endpoints but with GraphQL's type-safety and tooling advantages.

**Bandwidth reduction:** Not sending the full query text reduces request size, which is beneficial for mobile clients.

### Trade-offs

**Development velocity:** Developers must register new queries before they can be used. This adds a build step and coordination between frontend and backend teams. Hot-reloading in development requires a different configuration than production.

**Client-server coupling:** The query registry creates a deployment dependency. The server must have the query registered before the client sends it. This requires coordinated deploys or a registration step in the CI/CD pipeline.

**Flexibility loss:** Ad-hoc queries for debugging, admin tools, or internal dashboards require either a separate endpoint without persisted query enforcement or explicit registration of debugging queries.

### Staged Rollout Strategy

1. **Phase 1 — Monitoring:** Deploy APQ in logging mode. Record all queries and their hashes. Identify the set of queries in active use.
2. **Phase 2 — Soft enforcement:** Enable APQ with automatic registration. New queries are accepted and registered. Alert on unrecognized query patterns.
3. **Phase 3 — Strict enforcement for external clients:** Mobile and public-facing clients must use persisted queries. Internal tools and admin interfaces may still use ad-hoc queries via a separate authenticated endpoint.
4. **Phase 4 — Full enforcement:** All operations must be persisted. The query registry is managed as code, reviewed in PRs, and deployed alongside the schema.

---

## GraphQL Subscriptions Security

### How Subscriptions Work

GraphQL subscriptions use a persistent transport (typically WebSocket via the `graphql-ws` or legacy `subscriptions-transport-ws` protocol) to push real-time updates to clients. The client sends a subscription operation, and the server sends data whenever the subscribed event occurs:

```graphql
subscription {
  orderStatusChanged(orderId: "123") {
    status
    updatedAt
    deliveryEstimate
  }
}
```

The server maintains the subscription in memory, listening for events and executing the subscription resolver whenever relevant data changes.

### Security Concerns

**WebSocket authentication:** The initial WebSocket handshake does not carry HTTP headers in the same way as regular requests. Authentication must be handled during the connection initialization phase:

```javascript
const server = new ApolloServer({ ... });

const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

useServer({
  context: async (ctx) => {
    const token = ctx.connectionParams?.authToken;
    if (!token) throw new Error('Missing auth token');
    const user = await verifyToken(token);
    if (!user) throw new Error('Invalid token');
    return { user };
  },
  onSubscribe: (ctx, msg) => {
    // Validate the subscription operation
    // Check authorization for the subscribed resource
  },
}, wsServer);
```

**Token expiration during long-lived connections:** A WebSocket connection may outlive the authentication token's validity. Unlike HTTP requests where each request carries a fresh token, a WebSocket authenticated at connection time may remain open for hours or days. Implement periodic re-authentication or close connections when tokens expire:

```javascript
onConnect: (ctx) => {
  const tokenExpiry = ctx.user.tokenExp;
  const timeout = (tokenExpiry * 1000) - Date.now();
  setTimeout(() => ctx.extra.socket.close(4401, 'Token expired'), timeout);
}
```

**Subscription depth and complexity:** The same depth and complexity limits that apply to queries must apply to subscription operations. A subscription that triggers a deeply nested resolver chain on every event can cause sustained resource exhaustion.

**Resource exhaustion through subscription flooding:** An attacker can open thousands of subscriptions, each consuming server memory and event-processing capacity. Mitigations:

- Limit the number of concurrent subscriptions per connection and per user.
- Limit the total number of WebSocket connections per IP and per authenticated user.
- Implement backpressure: if the client cannot consume events fast enough, drop events or close the connection rather than buffering indefinitely.
- Set idle timeouts: close subscriptions that haven't received events within a configurable period.

**Authorization on events:** Authorization must be checked not only when the subscription is created but also when each event is delivered. A user's permissions may change during the lifetime of a subscription. If a user loses access to an order, the `orderStatusChanged` subscription for that order should stop delivering events:

```javascript
const resolvers = {
  Subscription: {
    orderStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('ORDER_STATUS_CHANGED'),
        async (payload, variables, context) => {
          const hasAccess = await checkOrderAccess(context.user, variables.orderId);
          return hasAccess && payload.orderId === variables.orderId;
        },
      ),
    },
  },
};
```

---

## Federation and Subgraph Security

### What Federation Is

GraphQL federation (Apollo Federation, GraphQL Mesh, or schema stitching) composes multiple GraphQL services (subgraphs) into a unified API served by a gateway (router). Each subgraph owns a portion of the schema:

```
Gateway / Router
├── Users subgraph (owns User type)
├── Orders subgraph (owns Order type, extends User with orders field)
├── Billing subgraph (owns BillingInfo, extends Organization)
└── Inventory subgraph (owns Product, extends Order with items)
```

### Authorization Consistency Across Subgraphs

The central security challenge in federation is ensuring consistent authorization across independently developed and deployed subgraphs:

**The gateway trust boundary:** The gateway authenticates the request and passes identity context (user, roles, tenant) to subgraphs via headers or context propagation. Each subgraph must independently enforce authorization — the gateway cannot know what authorization each subgraph field requires.

**Cross-subgraph authorization gaps:** When the Orders subgraph extends the User type with an `orders` field, it receives a User reference from the Users subgraph. The Orders subgraph must independently verify that the requesting user has access to the referenced user's orders. It cannot assume that because the Users subgraph returned the user, the requester is authorized to see that user's orders.

```graphql
# Orders subgraph
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]! @requires(fields: "id")
}

# The orders resolver MUST check authorization
# It cannot trust that the User reference implies access
```

**Schema composition risks:** When subgraphs are composed, the gateway merges their schemas. A subgraph can accidentally expose fields or types that conflict with another subgraph's authorization model. Schema composition linting (Apollo's `rover` CLI, for example) should check for:

- Fields that override authorization directives from other subgraphs.
- Types that expose relationships bypassing another subgraph's access controls.
- Input types that accept arguments intended for internal use only.

### Mitigation Patterns

**Centralized policy service:** All subgraphs call the same authorization service (e.g., OPA) with the same policy definitions. This ensures consistent authorization decisions regardless of which subgraph is resolving.

**Gateway-level authorization for cross-cutting concerns:** The gateway enforces coarse-grained authorization (authentication, tenant isolation, blocked users) before forwarding to subgraphs. Subgraphs enforce fine-grained, domain-specific authorization.

**Schema linting in CI:** Automated checks on schema changes to verify that authorization directives are present on sensitive fields, that new types include appropriate access controls, and that extending types from other subgraphs doesn't introduce authorization gaps.

**End-to-end authorization tests:** Integration tests that send queries traversing multiple subgraphs and verify authorization is enforced at each boundary.

---

## Error Handling and Information Leakage

### How GraphQL Errors Leak Information

GraphQL's error response format is rich and structured, which aids debugging but can leak sensitive information in production:

```json
{
  "errors": [
    {
      "message": "Cannot read property 'organizationId' of null",
      "locations": [{ "line": 3, "column": 5 }],
      "path": ["user", "organization"],
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
        "exception": {
          "stacktrace": [
            "TypeError: Cannot read property 'organizationId' of null",
            "    at UserResolver.organization (/app/src/resolvers/user.js:42:15)",
            "    at processTicksAndRejections (internal/process/task_queues.js:95:5)"
          ]
        }
      }
    }
  ]
}
```

This error reveals: the file structure (`/app/src/resolvers/user.js`), the line number (42), the property name (`organizationId`), the framework and Node.js version, and that the user object can be null.

### Information Leakage Vectors

**Stack traces:** Internal implementation details including file paths, line numbers, library versions, and database driver information.

**Field suggestions:** `Cannot query field "emai" on type "User". Did you mean "email"?` — this confirms the existence of the `email` field even when introspection is disabled, enabling schema enumeration one field at a time.

**Database errors:** `"message": "ER_NO_SUCH_TABLE: Table 'prod_db.user_secrets' doesn't exist"` — reveals database names and table structures.

**Validation errors with internal context:** `"Argument 'role' must be one of: ADMIN, SUPER_ADMIN, BILLING_ADMIN, INTERNAL_SERVICE"` — reveals internal role values.

**Partial data with errors:** GraphQL returns partial results alongside errors. A query for five fields where one fails returns four successful results and one error. The error for the restricted field might reveal why access was denied, while the four successful results might include data the user shouldn't have seen.

### Hardening Error Responses

**Mask errors in production:**

```javascript
const server = new ApolloServer({
  formatError: (formattedError, error) => {
    if (process.env.NODE_ENV === 'production') {
      // Log the full error internally
      logger.error('GraphQL error', {
        message: error.message,
        stack: error.stack,
        path: formattedError.path,
      });

      // Return a sanitized error to the client
      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'An unexpected error occurred',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }

      // Allow known error codes through with sanitized messages
      return {
        message: formattedError.message,
        extensions: { code: formattedError.extensions?.code },
      };
    }
    return formattedError;
  },
});
```

**Disable field suggestions:** Suppress the "Did you mean" suggestions in production to prevent schema enumeration.

**Use structured error codes:** Define a set of client-facing error codes (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`) and map all errors to these codes. Never expose internal error messages.

**Avoid leaking existence through errors:** When a user queries a resource they don't have access to, return `NOT_FOUND` instead of `FORBIDDEN`. Returning `FORBIDDEN` confirms the resource exists; `NOT_FOUND` is ambiguous (it might not exist, or you might not have access).

---

## Comparison with REST API Security

### Where GraphQL Is Harder to Secure

| Concern | REST | GraphQL |
|---------|------|---------|
| **Attack surface enumeration** | Fixed set of routes — documented in OpenAPI spec or discoverable through path fuzzing | Dynamic — introspection reveals the entire schema in one query |
| **DoS via query complexity** | Each endpoint has predictable cost | Client controls query depth, breadth, and field selection — cost varies by orders of magnitude |
| **Rate limiting** | Per-endpoint, per-method — straightforward | Per-request limits are insufficient — need operation-aware, cost-based limiting |
| **Authorization granularity** | Per-route or per-controller — coarse but simple | Per-field, per-type, per-object — complex to implement consistently across the graph |
| **Batching abuse** | Each operation is a separate HTTP request | Multiple operations or aliases in a single request |
| **Caching** | HTTP caching (ETags, Cache-Control) works naturally with GET requests and URL-based keys | All requests are POST to the same URL — HTTP caching doesn't work without persisted queries or GET-based queries |
| **WAF rules** | Path-based and method-based rules map naturally | WAF must parse GraphQL query bodies — most WAFs have limited or no GraphQL support |

### Where GraphQL Is Easier to Secure

| Concern | REST | GraphQL |
|---------|------|---------|
| **Over-fetching / data exposure** | Endpoints return fixed response shapes — may include fields the client doesn't need, increasing exposure | Client requests only needed fields — smaller response surface (but the full schema is still accessible) |
| **Type safety** | Input validation must be manually implemented or configured per-endpoint | Schema provides built-in type validation for all inputs — arguments, input objects, enums are checked before resolvers execute |
| **Schema as security contract** | API surface is implicit in code — security review requires reading route handlers | Schema is an explicit, reviewable, diffable artifact — schema changes are visible in PRs and can be linted |
| **Consistent error format** | Error formats vary across endpoints and frameworks | Structured error format is standardized by the spec |
| **Deprecation visibility** | Deprecated endpoints are documented informally | `@deprecated` directive is built into the spec and visible through introspection and tooling |

### Security Parity

Some security concerns apply equally to both paradigms: authentication, TLS, CORS, CSRF, input validation against injection (SQL, NoSQL, command), SSRF through user-controlled URLs, logging and monitoring, and secrets management. The attack vectors are the same; only the attack surface shape differs.

---

## Real-World GraphQL Vulnerabilities and Case Studies

### GitLab GraphQL Information Disclosure (2020)

GitLab's GraphQL API allowed unauthenticated users to query project information, including private project names and descriptions, through the `projects` query. The issue arose because the GraphQL resolver did not enforce the same visibility checks as the REST API. The REST endpoint correctly filtered private projects, but the GraphQL resolver bypassed this logic. This is a canonical example of authorization inconsistency when a GraphQL layer is added alongside existing REST endpoints.

### Shopify GraphQL IDOR (2021)

A researcher discovered that Shopify's GraphQL API allowed merchants to access other merchants' shop data by manipulating the `shop_id` parameter in GraphQL mutations. The authorization check was present on the REST endpoint but missing from the equivalent GraphQL mutation. Shopify paid a $22,500 bounty for the finding. The root cause was that the GraphQL resolver called an internal service without propagating the authenticated merchant's context.

### HackerOne GraphQL Disclosure (2019)

HackerOne's own GraphQL API had an issue where the `Team` type's `policy` field was accessible to users who should not have had access. The nested resolution of `team → policy` did not independently verify that the requesting user had access to the team's policy details. This demonstrated the nested authorization problem: the parent resolver authorized access to the team, but the child resolver for the policy field did not re-check authorization.

### GraphQL Batching for Brute Force

Multiple bug bounty reports across various platforms have documented using GraphQL batch queries for credential stuffing and brute-force attacks. By packing thousands of `login` mutations into a single HTTP request (either via array batching or aliases), attackers bypassed per-request rate limits while attempting credentials at high speed. The fix in each case was to implement operation-aware rate limiting that counts resolver invocations, not HTTP requests.

### GraphQL Introspection in Production APIs

Security researchers regularly find major APIs with introspection enabled in production. Surveys have found that a significant percentage of public GraphQL APIs expose their full schema through introspection, including APIs for financial services, healthcare platforms, and government systems. The exposed schemas reveal internal types, admin mutations, and deprecated-but-active fields that attackers use for targeted exploitation.

---

## Tools and Libraries

### Apollo Server Security Features

Apollo Server, the most widely used GraphQL server for Node.js, includes several built-in security features:

- **Introspection disabled by default in production** (when `NODE_ENV=production`).
- **CSRF prevention:** Requires a `Content-Type` header or a custom `Apollo-Require-Preflight` header to prevent simple CORS requests from triggering mutations.
- **Landing page controls:** The Apollo Studio sandbox can be disabled or restricted in production.
- **Plugin system:** Lifecycle hooks for request validation, response formatting, and error masking.
- **Automatic Persisted Queries (APQ):** Built-in support for query hashing and caching.

### graphql-shield

A permission layer for GraphQL servers that provides a declarative, composable authorization model:

```javascript
import { shield, rule, and, or, not, allow, deny } from 'graphql-shield';

const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, ctx) => ctx.user !== null
);

const isAdmin = rule({ cache: 'contextual' })(
  async (parent, args, ctx) => ctx.user?.role === 'ADMIN'
);

const isOwner = rule({ cache: 'strict' })(
  async (parent, args, ctx) => parent.userId === ctx.user?.id
);

const permissions = shield({
  Query: { '*': isAuthenticated },
  Mutation: { '*': isAuthenticated },
  User: {
    email: or(isOwner, isAdmin),
    ssn: isAdmin,
  },
}, {
  fallbackRule: deny,
  allowExternalErrors: false,
  debug: process.env.NODE_ENV !== 'production',
});
```

Caching modes (`contextual`, `strict`, `no_cache`) control when rule results are reused across fields, which is important for performance in deeply nested queries.

### graphql-depth-limit

A simple validation rule that rejects queries exceeding a maximum depth:

```javascript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  validationRules: [depthLimit(10, { ignore: ['__schema'] })],
});
```

The `ignore` option allows introspection queries (which are naturally deep) to bypass the depth limit when introspection is enabled.

### graphql-query-complexity

A more sophisticated cost analysis library that supports field-level cost annotations and multiplier-aware complexity calculation:

```javascript
import { getComplexity, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';

const complexity = getComplexity({
  schema,
  query: parsedQuery,
  variables,
  estimators: [
    fieldExtensionsEstimator(),
    simpleEstimator({ defaultComplexity: 1 }),
  ],
});

if (complexity > MAX_COMPLEXITY) {
  throw new Error(`Query complexity ${complexity} exceeds maximum ${MAX_COMPLEXITY}`);
}
```

### Additional Tools

- **graphql-armor:** A comprehensive security middleware suite providing depth limiting, cost limiting, alias limiting, character limiting, and disabled introspection in a single package.
- **Stellate (formerly GraphCDN):** A GraphQL edge caching and rate limiting proxy that sits in front of your GraphQL server and provides operation-aware rate limiting, query caching, and analytics.
- **InQL (Burp Suite extension):** A security testing tool that performs GraphQL introspection, generates queries for every type and field, and identifies potential security issues.
- **graphql-cop:** A security auditing tool that checks for common GraphQL misconfigurations: introspection enabled, field suggestions, batching enabled, debug mode, and more.
- **GraphQL Voyager:** A schema visualization tool. While intended for developers, it's also used by attackers to understand API structure after obtaining the schema through introspection.

---

## Defenses Summary (Secure-by-Default Checklist)

1. **Disable introspection in production.** Suppress field suggestions. Publish the schema through CI/CD for internal use.
2. **Enforce authorization at every resolver.** Use deny-by-default with graphql-shield or schema directives. Never trust parent context for child authorization.
3. **Implement depth limits and cost analysis.** Combine `graphql-depth-limit` with `graphql-query-complexity`. Tune thresholds using production query data.
4. **Limit batching and aliases.** Cap batch size. Count aliases in complexity scoring. Consider disabling array batching if unused.
5. **Use operation-aware rate limiting.** Rate limit by operation name, complexity cost, and authenticated user — not HTTP request count.
6. **Deploy persisted queries for public-facing APIs.** Start with APQ in monitoring mode and progress to strict enforcement.
7. **Harden error responses.** Mask stack traces, suppress field suggestions, use generic error codes. Log full errors server-side.
8. **Secure subscriptions.** Authenticate WebSocket connections. Check authorization on each event delivery. Limit concurrent subscriptions.
9. **Enforce consistent authorization in federated graphs.** Use a centralized policy service. Lint schema composition for authorization gaps.
10. **Use opaque, non-sequential IDs.** UUIDs prevent enumeration. Scope all queries by tenant.
11. **Monitor and observe.** Track resolver latency p95/p99, query complexity distribution, error rates, and rejected queries. Alert on anomalous query patterns.
12. **Validate inputs beyond type checking.** The schema validates types but not business rules. Sanitize string inputs against injection. Validate IDs against expected formats.

---

## Verification

- **Automated IDOR tests:** Authenticate as different users/tenants and traverse every query path. Verify that horizontal access (same role, different tenant) and vertical access (different role, same tenant) are both controlled.
- **Load tests with adversarial queries:** Construct worst-case queries (maximum depth, maximum aliases, expensive fields) and verify that limits are enforced and the server remains stable.
- **Schema review in PRs:** Treat schema changes like API surface changes. Review new fields for authorization requirements. Check that directives are present.
- **Logging policy:** Verify that the gateway logs operation name, complexity score, execution time, and authenticated user. Verify that resolver-level logging does not capture PII, tokens, or passwords.
- **Chaos testing:** Simulate resolver dependency failures (database timeout, downstream service unavailable) and verify the server degrades gracefully without leaking internal errors.

---

## Operational Reality

**Complexity scoring requires iteration:** Initial cost annotations will be wrong. Some fields are more expensive than expected (a "simple" field that triggers a service call), and some are less expensive (a field that's always cached). Plan for ongoing tuning based on production resolver metrics.

**Persisted queries slow iteration but improve safety:** The development experience with strict persisted queries is worse — every query change requires registration. Use a staged approach: lenient in development, strict in production. Invest in tooling (IDE plugins, CI/CD query extraction) to reduce friction.

**Federation authorization is an organizational problem:** When multiple teams own subgraphs, authorization consistency requires organizational coordination — shared policy definitions, cross-team schema reviews, and integration tests that span subgraphs. Technical solutions (centralized policy engine) must be paired with process solutions (schema governance).

**GraphQL visibility:** Unlike REST APIs where each endpoint is a distinct log entry with a distinct URL, GraphQL operations all hit the same URL. Without operation-name-based logging and monitoring, all traffic looks identical. Mandate named operations and invest in GraphQL-aware observability tooling.

---

## Interview Clusters

- **Fundamentals:** "What is GraphQL introspection and why disable it?" "How does GraphQL authorization differ from REST?"
- **Mid-level:** "How do aliases bypass rate limits?" "What are persisted queries and when would you use them?"
- **Senior:** "How do you enforce authZ per field at scale in a federated graph?" "Design a rate limiting system for a public GraphQL API."
- **Staff:** "How do you prevent GraphQL from becoming a DoS amplifier against your data tier?" "A new subgraph team is joining the federated graph — what security requirements do you impose?" "Walk me through your response to a GraphQL-based data breach."

---

## Cross-links

CORS, JWT/OAuth, IDOR/BOLA, SSRF, Business Logic Abuse, Rate Limiting and Abuse Prevention, API Security (REST), Security Observability, Threat Modeling, Web Application Security Vulnerabilities.
