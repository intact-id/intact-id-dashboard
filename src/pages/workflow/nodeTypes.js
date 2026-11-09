import { ConditionNode, EndNode, ReviewNode, ServiceNode, StartNode } from './nodes';

export const nodeTypes = {
    START: StartNode,
    SERVICE: ServiceNode,
    CONDITION: ConditionNode,
    MANUAL_REVIEW: ReviewNode,
    END: EndNode,
};
