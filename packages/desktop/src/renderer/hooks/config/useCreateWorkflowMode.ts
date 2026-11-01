import { CREATE_WORKFLOW_BUILD } from '@renderer/utils/createWorkflowBuild';
import { useConfig } from './useConfig';

/** Hidden, opt-in. Customer builds compile CREATE_WORKFLOW_BUILD to false and drop the route. */
export function useCreateWorkflowMode(): boolean {
  const [value] = useConfig('ui.createWorkflow');
  return CREATE_WORKFLOW_BUILD && value === true;
}
