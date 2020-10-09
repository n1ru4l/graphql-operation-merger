import type {
  DefinitionNode,
  OperationDefinitionNode,
  SelectionNode,
  VariableDefinitionNode,
} from "graphql";
import cloneDeep from "lodash.clonedeep";

type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Function | Date | Error | RegExp;

export type DeepWritable<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepWritable<K>, DeepWritable<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<DeepWritable<K>, DeepWritable<V>>
  : T extends WeakMap<infer K, infer V>
  ? WeakMap<DeepWritable<K>, DeepWritable<V>>
  : T extends Set<infer U>
  ? Set<DeepWritable<U>>
  : T extends ReadonlySet<infer U>
  ? Set<DeepWritable<U>>
  : T extends WeakSet<infer U>
  ? WeakSet<DeepWritable<U>>
  : T extends Promise<infer U>
  ? Promise<DeepWritable<U>>
  : T extends {}
  ? { -readonly [K in keyof T]: DeepWritable<T[K]> }
  : T;

export const mergeSelections = (
  selectionsA: ReadonlyArray<SelectionNode>,
  selectionsB: ReadonlyArray<SelectionNode>
): DeepWritable<Array<SelectionNode>> => {
  const newSelections: Array<SelectionNode> = selectionsA.map((selection) =>
    cloneDeep(selection)
  );
  for (const selectionNode of selectionsB) {
    if (selectionNode.kind === "Field") {
      const match = newSelections.find(
        (selection) =>
          selection.kind === "Field" &&
          selection.alias === selectionNode.alias &&
          selection.name.value === selectionNode.name.value
      );
      if (match) {
        if (match.kind !== "Field") {
          throw new Error("Unexpected error.");
        }
        if (match.selectionSet && selectionNode.selectionSet) {
          match.selectionSet.selections = mergeSelections(
            match.selectionSet.selections,
            selectionNode.selectionSet.selections
          );
        }
      } else {
        newSelections.push(
          cloneDeep(selectionNode) as DeepWritable<SelectionNode>
        );
      }
    } else if (selectionNode.kind === "InlineFragment") {
      const match = newSelections.find(
        (selection) =>
          selection.kind === "InlineFragment" &&
          selection.typeCondition?.name.value ===
            selectionNode.typeCondition?.name.value
      );
      if (match) {
        if (match.kind !== "InlineFragment") {
          throw new Error("Unexpected error.");
        }
        match.selectionSet.selections = mergeSelections(
          match.selectionSet.selections,
          selectionNode.selectionSet.selections
        );
      } else {
        newSelections.push(
          cloneDeep(selectionNode) as DeepWritable<SelectionNode>
        );
      }
    } else {
      newSelections.push(
        cloneDeep(selectionNode) as DeepWritable<SelectionNode>
      );
    }
  }

  return newSelections as DeepWritable<Array<SelectionNode>>;
};

export const mergeGraphQLOperations = (
  definitions: DefinitionNode[]
): DefinitionNode => {
  if (definitions.length === 0) {
    throw new Error("Expected at least one definition.");
  } else if (definitions.length === 1) {
    return definitions[0];
  }

  const [definition, ...remainingDefinitions] = definitions;
  if (definition.kind !== "OperationDefinition") {
    throw new Error(
      `Expected 'OperationDefinition'. Got '${definition.kind}'.`
    );
  }

  const output = cloneDeep(definition) as DeepWritable<OperationDefinitionNode>;

  for (const currentDefinition of remainingDefinitions) {
    if (currentDefinition.kind !== "OperationDefinition") {
      throw new Error(
        `Expected 'OperationDefinition'. Got '${currentDefinition.kind}'.`
      );
    }

    if (output.operation !== currentDefinition.operation) {
      throw new Error(
        `Expected '${output.operation}'. Got '${currentDefinition.operation}'.`
      );
    }

    if (currentDefinition.variableDefinitions !== undefined) {
      // Variable Definition Merging
      if (output.variableDefinitions === undefined) {
        const variableDefinitions: Array<VariableDefinitionNode> = (output.variableDefinitions = []);

        for (const variableDefinition of currentDefinition.variableDefinitions) {
          const match = variableDefinitions.find(
            (definition) =>
              definition.variable.name === variableDefinition.variable.name
          );
          if (match && match.type !== variableDefinition.type) {
            throw new Error(
              `Variable definition types do not match. Expected ${match.type} for variable '${match.variable.name}'. Got '${variableDefinition.type}'.`
            );
          }
          variableDefinitions.push(cloneDeep(variableDefinition));
        }
      }
      // Selection Set Merging
      output.selectionSet.selections = mergeSelections(
        output.selectionSet.selections,
        currentDefinition.selectionSet.selections
      );
    }
  }
  return output as DefinitionNode;
};
