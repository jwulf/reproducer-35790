# Reproducer for camunda/camunda #35790

This is a minimal reproducer for [issue #35790](https://github.com/camunda/camunda/issues/35790)

## Prerequisites

* Node.js 20+
* Docker (for local reproducer)
* 8.8.0-alpha6 SaaS cluster API credentials

## To run the reproducer

- Clone this repository
- `npm i` # Install dependencies
- Configure 8.8.0-alpha6 SaaS cluster credentials in `camunda-test-config-saas.json`
- `npm run test:saas`

The test will run continually, until it fails.

## Description

This reproducer runs a simple test repeatedly until it fails. 

The test creates a process instance that contains a user task. 

It then polls the Search User Task endpoint until it gets back the created User Task for the started process instance. 

When it receives the user task, it calls the Search User Tasks Variables for the variables for the user task using the key returned by the previous query. 

For the remote test, the process instance is cancelled after each run.  

## Expected behaviour

The test should either always pass or always fail. 

The expectation is that the user task variables are always available when the user task is returned by the search endpoint. 

## Actual behaviour

The test intermittently fails on SaaS, as the variables for the user task are not found.

_Sometimes_ the user task variables are not available at the same time as the user task.

Example output: 

```
 console.log
    processInstance {
      "processDefinitionId": "test-tasks-query",
      "processDefinitionVersion": 1,
      "tenantId": "<default>",
      "variables": {},
      "processDefinitionKey": "2251799813688817",
      "processInstanceKey": "6755399445531161"
    }

      at test/test.spec.ts:29:13

  console.log
    tasks {
      "items": [
        {
          "name": "Enter customer details",
          "state": "CREATED",
          "elementId": "Activity_1nouls1",
          "processDefinitionId": "test-tasks-query",
          "creationDate": "2025-07-28T02:36:55.771Z",
          "tenantId": "<default>",
          "processDefinitionVersion": 1,
          "customHeaders": {},
          "priority": 50,
          "userTaskKey": "6755399445531167",
          "elementInstanceKey": "6755399445531166",
          "processDefinitionKey": "2251799813688817",
          "processInstanceKey": "6755399445531161",
          "formKey": "2251799813688818"
        }
      ],
      "page": {
        "totalItems": 1,
        "startCursor": "WzE3NTM2NzAyMTU3NzEsNjc1NTM5OTQ0NTUzMTE2N10=",
        "endCursor": "WzE3NTM2NzAyMTU3NzEsNjc1NTM5OTQ0NTUzMTE2N10="
      }
    }

      at test/test.spec.ts:52:13

  console.log
    task {
      "name": "Enter customer details",
      "state": "CREATED",
      "elementId": "Activity_1nouls1",
      "processDefinitionId": "test-tasks-query",
      "creationDate": "2025-07-28T02:36:55.771Z",
      "tenantId": "<default>",
      "processDefinitionVersion": 1,
      "customHeaders": {},
      "priority": 50,
      "userTaskKey": "6755399445531167",
      "elementInstanceKey": "6755399445531166",
      "processDefinitionKey": "2251799813688817",
      "processInstanceKey": "6755399445531161",
      "formKey": "2251799813688818"
    }

      at test/test.spec.ts:61:13

  camunda:test 🏁 Tearing down Camunda Process Test environment... +3s
  camunda:test 🛑 Stopping runtime... +0ms
  camunda:test 🛑 Stopping Camunda runtime... +3s
  camunda:test ✅ Camunda runtime stopped successfully +0ms
  camunda:test ✅ Camunda Process Test environment torn down successfully +0ms
 FAIL  test/test.spec.ts
  ✕ It can retrieve the variables for a user task (3480 ms)

  ● It can retrieve the variables for a user task

    HTTPError: Response code 404 (Not Found) (POST https://syd-1.zeebe.camunda.io/e4ce677f-e458-421b-ab33-3f0b02a3ebba/v2/user-tasks/6755399445531167/variables/search). {"type":"about:blank","title":"NOT_FOUND","status":404,"detail":"Flow node instance with key 6755399445531166 not found","instance":"/e4ce677f-e458-421b-ab33-3f0b02a3ebba/v2/user-tasks/6755399445531167/variables/search"}.
```
## Additional detail

You can run the exact same test against a local instance of a Camunda 8.8.0-alpha6 container locally with the command:

```
npm test
```

This test does not fail after 25 runs. This seems to be an issue with the SaaS cluster only.