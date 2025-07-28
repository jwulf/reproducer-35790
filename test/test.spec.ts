import { randomUUID } from 'crypto'

import {
    setupCamundaProcessTest,
    CamundaAssert
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
    const task = await c8.getUserTask(userTaskKey)
    console.log('task', JSON.stringify(task, null, 2))

    expect(task.processInstanceKey).toBe(processInstance.processInstanceKey)

    // We got the user task, now we can check the variables
    const variables = await c8.searchUserTaskVariables({
        userTaskKey,
        sort: [{ field: 'name', order: 'ASC' }],
    })
    console.log('variables', JSON.stringify(variables, null, 2))

    // This *INTERMITTENTLY* fails, but it should not
    expect(variables.items[0].value).toBe(`"${uuid}"`)
})
