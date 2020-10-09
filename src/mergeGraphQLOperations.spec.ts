import "@graphql-codegen/testing";
import { parse, print } from "graphql";
import { mergeGraphQLOperations } from "./mergeGraphQLOperations";

it("can merge two basic operations", () => {
  const op1 = parse(/* GraphQL */ `
    query foo {
      me {
        id
      }
    }
  `);

  const op2 = parse(/* GraphQL */ `
    query foo {
      me {
        id
        login
      }
    }
  `);

  const merged = mergeGraphQLOperations([
    ...op1.definitions,
    ...op2.definitions,
  ]);
  const result = print(merged);
  expect(result).toBeSimilarStringTo(/* GraphQL */ `
    query foo {
      me {
        id
        login
      }
    }
  `);
});

it("cannot merge two operations with a different type", () => {
  const op1 = parse(/* GraphQL */ `
    query foo {
      me {
        id
      }
    }
  `);

  const op2 = parse(/* GraphQL */ `
    mutation foo {
      me {
        id
        login
      }
    }
  `);

  expect(() => {
    mergeGraphQLOperations([...op1.definitions, ...op2.definitions]);
  }).toThrow("Expected 'query'. Got 'mutation'.");
});

it("can merge nested fields", () => {
  const op1 = parse(/* GraphQL */ `
    query foo {
      me {
        id
        f {
          d
        }
      }
      lol {
        a
      }
    }
  `);

  const op2 = parse(/* GraphQL */ `
    query foo {
      me {
        id
        login
      }
    }
  `);

  const merged = mergeGraphQLOperations([
    ...op1.definitions,
    ...op2.definitions,
  ]);
  const result = print(merged);
  expect(result).toBeSimilarStringTo(/* GraphQL */ `
    query foo {
      me {
        id
        f {
          d
        }
        login
      }
      lol {
        a
      }
    }
  `);
});

it("can merge fragment spreads", () => {
  const op1 = parse(/* GraphQL */ `
    query foo {
      me {
        id
        ...MeFragment
      }
    }
  `);

  const op2 = parse(/* GraphQL */ `
    query foo {
      me {
        id
        login
        ...UserFragment
      }
    }
  `);

  const merged = mergeGraphQLOperations([
    ...op1.definitions,
    ...op2.definitions,
  ]);
  const result = print(merged);
  expect(result).toBeSimilarStringTo(/* GraphQL */ `
    query foo {
      me {
        id
        ...MeFragment
        login
        ...UserFragment
      }
    }
  `);
});

it("can merge inline fragment spreads", () => {
  const op1 = parse(/* GraphQL */ `
    query foo {
      me {
        ... on User {
          id
          login
        }
      }
    }
  `);

  const op2 = parse(/* GraphQL */ `
    query foo {
      me {
        ... on User {
          id
          login
        }
      }
    }
  `);

  const merged = mergeGraphQLOperations([
    ...op1.definitions,
    ...op2.definitions,
  ]);
  const result = print(merged);
  expect(result).toBeSimilarStringTo(/* GraphQL */ `
    query foo {
      me {
        ... on User {
          id
          login
        }
      }
    }
  `);
});
