/**
 * This test reproduces an intermittent issue with the Camunda 8 SaaS cluster.
 * It creates a process instance with a user task, and then polls for the user task and
 * its variables. Sometimes, the user task or its variables are not found, leading to a
 * failure in the test.
 * 
 * To run, set up the Camunda SaaS cluster credentials in `camunda-test-config-saas.json` and run:
 * `npm run test:saas`
 * 
 * To run the same test with polling for eventual consistency, see `test/test-with-poll.spec.ts`.
 * 
 * To run this test against a local Camunda container, use:
 * `npm run test:local`
 */
import { PollingOperation, Camunda8, HTTPError } from '@camunda8/sdk';

const camunda = new Camunda8().getCamundaRestClient();

function deployResources() {
    return camunda.deployResourcesFromFiles([
        './test/test-tasks-query.bpmn',
        './test/test-basic-form.form',
    ]);
}

function cancelProcessInstance(processInstanceKey: string) {
    return camunda.cancelProcessInstance({ processInstanceKey }).catch(error => {
        if (error instanceof HTTPError && error.statusCode === 404) {
            return
        }
        console.error('Error cancelling process instance:', error);
    });
}

interface Failures {
    couldNotRetrieveUserTask: Array<{ userTaskKey: string, error: Error }>;
    couldNotRetrieveVariables: Array<{ userTaskKey: string, error: Error }>;
    couldNotRetrieveAcutualVariables: Array<{ userTaskKey: string, error: Error }>;
}

async function main() {
    const failures: Failures = {
        couldNotRetrieveUserTask: [],
        couldNotRetrieveVariables: [],
        couldNotRetrieveAcutualVariables: [],
    }
    const deploymentResponse = await deployResources();
    const { processDefinitionId } = deploymentResponse.processes[0]

    for (let i = 1; i < 101; i++) {
        console.log(`Run ${i}/100...`);

        const queryTag = `test-${i}`;
        const { processInstanceKey } = await camunda.createProcessInstance({
            processDefinitionId,
            variables: {
                queryTag,
            },
        })

        // Search user tasks - this will poll until the task is created
        const taskSearchResponse = await PollingOperation({
            operation: () =>
                camunda.searchUserTasks({
                    page: {
                        from: 0,
                        limit: 10,
                    },
                    filter: {
                        state: 'CREATED',
                        processInstanceKey,
                    },
                    sort: [
                        {
                            field: 'creationDate',
                        },
                    ],
                }),
            interval: 500,
            timeout: 7000,
        })
        const taskFromQuery = taskSearchResponse.items[0];
        const userTaskKey = taskFromQuery.userTaskKey

        // Now get the user task by key 
        // This *INTERMITTENTLY* fails, but it should not
        const task = await camunda.getUserTask(userTaskKey).catch(error => {
            console.error('Error getting user task:', error.message);
            failures.couldNotRetrieveUserTask.push({ userTaskKey, error });
            return false
        })
        if (!task) {
            cancelProcessInstance(processInstanceKey);
            continue;
        }

        // We got the user task, now we can check the variables
        // This *INTERMITTENTLY* fails, but it should not
        const variables = await camunda.searchUserTaskVariables({
            userTaskKey,
            sort: [{ field: 'name', order: 'ASC' }],
        }).catch(error => {
            console.error('User task variables not found:', error.message);
            failures.couldNotRetrieveVariables.push({ userTaskKey, error });
            return false as const
        })
        if (variables === false) {
            cancelProcessInstance(processInstanceKey);
            continue;
        } else if (variables.items.length === 0) {
            console.error('No variables found for user task:', userTaskKey);
            failures.couldNotRetrieveAcutualVariables.push({ userTaskKey, error: new Error('No variables found') });
        }
        cancelProcessInstance(processInstanceKey);
    }
    console.log('Failure rate:');
    console.log('Could not retrieve user task:', failures.couldNotRetrieveUserTask.length);
    console.log('Could not retrieve variables:', failures.couldNotRetrieveVariables.length);
    console.log('Could not retrieve actual variables:', failures.couldNotRetrieveAcutualVariables.length);
    console.log('Total runs:', 100);
    console.log('-------------');
    console.log('Detailed failure information:');
    console.log(`${failures.couldNotRetrieveUserTask.length}/100 times we got a user task back in a search query, but when we tried to get that user task by key, it was not found.`);
    console.log(`${failures.couldNotRetrieveVariables.length}/100 times we got a user task back in a search query, but when we tried to get the variables for that user task, it was not found.`);
    console.log(`${failures.couldNotRetrieveAcutualVariables.length}/100 times we got a user task back in a search query, but when we tried to get the variables for that user task, the variables were not populated.`);
}

main()