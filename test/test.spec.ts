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
import { randomUUID } from 'crypto'

import {
    setupCamundaProcessTest,
} from '@camunda8/process-test';
import { PollingOperation } from '@camunda8/sdk';

const setup = setupCamundaProcessTest();

let processInstanceKey: string | undefined = undefined;

afterAll(async () => {
    const runtimeMode = setup.getContext().getRuntimeMode()
    const c8 = setup.getClient().getCamundaRestClient() 
    // cancel all process instances created by this test if we are in remote mode
    if (processInstanceKey && runtimeMode === 'REMOTE') {
        console.log('Cancelling process instance', processInstanceKey)
        await c8.cancelProcessInstance({ processInstanceKey })
    }
})

test('It can retrieve the variables for a user task', async () => {
    // Setup the test environment
    const c8 = setup.getClient().getCamundaRestClient()

    const deploymentResponse = await c8.deployResourcesFromFiles([
        './test/test-tasks-query.bpmn',
        './test/test-basic-form.form',
    ])
    const key = deploymentResponse.processes[0].processDefinitionKey
    const id = deploymentResponse.processes[0].processDefinitionId
    const uuid = randomUUID()
    const processInstance = await c8.createProcessInstance({
        processDefinitionId: id,
        variables: {
            queryTag: uuid,
        },
    })
    expect(processInstance.processDefinitionKey).toBe(key)
    processInstanceKey = processInstance.processInstanceKey
    console.log('processInstance', JSON.stringify(processInstance, null, 2))

    // Search user tasks - this will poll until the task is created
    const taskSearchResponse = await PollingOperation({
        operation: () =>
            c8.searchUserTasks({
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
    console.log('tasks', JSON.stringify(taskSearchResponse, null, 2))
    expect(taskSearchResponse.items[0].processInstanceKey).toBe(processInstance.processInstanceKey)

    // We expect that the task is created and has a userTaskKey
    const userTaskKey = taskSearchResponse.items[0].userTaskKey
    expect(userTaskKey).toBeDefined()

    // Now get the user task by key 
    // This *INTERMITTENTLY* fails, but it should not
    const task = await c8.getUserTask(userTaskKey)
    console.log('task', JSON.stringify(task, null, 2))

    expect(task.processInstanceKey).toBe(processInstance.processInstanceKey)

    // We got the user task, now we can check the variables
    // This *INTERMITTENTLY* fails, but it should not
    const variables = await c8.searchUserTaskVariables({
        userTaskKey,
        sort: [{ field: 'name', order: 'ASC' }],
    })
    console.log('variables', JSON.stringify(variables, null, 2))

    // This *INTERMITTENTLY* fails, but it should not
    expect(variables.items[0].value).toBe(`"${uuid}"`)
})
