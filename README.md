# Reproducer for camunda/camunda #35790

This is a minimal reproducer for [issue #35790](https://github.com/camunda/camunda/issues/35790)

## Prerequisites

* Node.js 20+
* 8.8.0-alpha6 SaaS cluster API credentials
* Optional: Docker (for local reproducer case)

## To run the reproducer

- Clone this repository
- `npm i` # Install dependencies
- Configure 8.8.0-alpha6 SaaS cluster credentials in `camunda-test-config-saas.json`
- `npm run test:saas`

The test (`test/test.spec.ts`) will run continually, until it fails.

## Description

This reproducer runs a simple test repeatedly until it fails. 

The test:

1. Creates a process instance that contains a user task. 
2. Polls the [Search User Tasks](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/search-user-tasks/) endpoint until it gets back the CREATED User Task for the started process instance. 
3. It then calls the [Get User Task](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/get-user-task/) endpoint to get the User Task by the `userTaskKey` from the query result.
3. When it receives the user task, it calls the [Search User Task Variables](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/search-user-task-variables/) endpoint for the variables for the user task using the key returned by the previous query. 

For the remote test (against SaaS), the process instance is cancelled after each run.  

## Expected behaviour

The test should either always pass or always fail. 

The expectation is that the user task variables are always available when the user task is returned by the search endpoint. 

## Actual behaviour

The test intermittently fails on SaaS, as one of the entities cannot be found by key.

_Sometimes_ the user task or the user task variables are not available.

There are three failure states: 

1. The user task is returned in a search query, but throws 404 when requested by key
2. The query for the variables fails with 404
3. The query for the search variables returns 200 but with an empty set of variables.

### Example of user task returned in query, but 404 when you GET it

1. We called [Search User Tasks](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/search-user-tasks/) and got back a CREATED User Task entity for our process instance. 
2. We call [Get User Task](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/get-user-task/) using the `userTaskKey` from the search result.
3. The Get User Task endpoint throws 404.

```
  console.log
    processInstance {
      "processDefinitionId": "test-tasks-query",
      "processDefinitionVersion": 1,
      "tenantId": "<default>",
      "variables": {},
      "processDefinitionKey": "2251799813688817",
      "processInstanceKey": "2251799818732446"
    }

      at test/test-with-poll.spec.ts:42:13

  console.log
    tasks {
      "items": [
        {
          "name": "Enter customer details",
          "state": "CREATED",
          "elementId": "Activity_1nouls1",
          "processDefinitionId": "test-tasks-query",
          "creationDate": "2025-07-28T03:28:14.813Z",
          "tenantId": "<default>",
          "processDefinitionVersion": 1,
          "customHeaders": {},
          "priority": 50,
          "userTaskKey": "2251799818732452",
          "elementInstanceKey": "2251799818732451",
          "processDefinitionKey": "2251799813688817",
          "processInstanceKey": "2251799818732446",
          "formKey": "2251799813688818"
        }
      ],
      "page": {
        "totalItems": 1,
        "startCursor": "WzE3NTM2NzMyOTQ4MTMsMjI1MTc5OTgxODczMjQ1Ml0=",
        "endCursor": "WzE3NTM2NzMyOTQ4MTMsMjI1MTc5OTgxODczMjQ1Ml0="
      }
    }

      at test/test-with-poll.spec.ts:65:13

  camunda:test 🏁 Tearing down Camunda Process Test environment... +2s
  camunda:test 🛑 Stopping runtime... +0ms
  camunda:test 🛑 Stopping Camunda runtime... +2s
  camunda:test ✅ Camunda runtime stopped successfully +0ms
  camunda:test ✅ Camunda Process Test environment torn down successfully +0ms
  console.log
    Cancelling process instance 2251799818732446

      at test/test-with-poll.spec.ts:18:17

 FAIL  test/test-with-poll.spec.ts
  ✕ It can retrieve the variables for a user task (2478 ms)

  ● It can retrieve the variables for a user task

    HTTPError: Response code 404 (Not Found) (GET https://syd-1.zeebe.camunda.io/e4ce677f-e458-421b-ab33-3f0b02a3ebba/v2/user-tasks/2251799818732452). {"type":"about:blank","title":"NOT_FOUND","status":404,"detail":"User task with key 2251799818732452 not found","instance":"/e4ce677f-e458-421b-ab33-3f0b02a3ebba/v2/user-tasks/2251799818732452"}. Enhanced stack trace available as error.source.
```

### Example output of variable query failure with 404 response

1. We called [Search User Tasks](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/search-user-tasks/) and got back a CREATED User Task entity for our process instance. 
2. We called [Get User Task](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/get-user-task/) using the `userTaskKey` from the search result, and got back a User Task entity.
3. We call [Search User Task Variables](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/search-user-task-variables/).
4. The Search User Task Variables endpoint throws 404 for the `userTaskKey`.

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

### Query returns empty set

1. We called [Search User Tasks](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/search-user-tasks/) and got back a CREATED User Task entity for our process instance. 
2. We called [Get User Task](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/get-user-task/) using the `userTaskKey` from the search result, and got back a User Task entity.
3. We call [Search User Task Variables](https://docs.camunda.io/docs/next/apis-tools/orchestration-cluster-api-rest/specifications/search-user-task-variables/).
4. The Search User Task Variables endpoint returns a result `userTaskKey`, but the query set is empty.

```

    console.log
      processInstance {
        "processDefinitionId": "test-tasks-query",
        "processDefinitionVersion": 1,
        "tenantId": "<default>",
        "variables": {},
        "processDefinitionKey": "2251799813688817",
        "processInstanceKey": "4503599631857027"
      }

      at test/test.spec.ts:42:13

    console.log
      tasks {
        "items": [
          {
            "name": "Enter customer details",
            "state": "CREATED",
            "elementId": "Activity_1nouls1",
            "processDefinitionId": "test-tasks-query",
            "creationDate": "2025-07-28T03:20:21.689Z",
            "tenantId": "<default>",
            "processDefinitionVersion": 1,
            "customHeaders": {},
            "priority": 50,
            "userTaskKey": "4503599631857033",
            "elementInstanceKey": "4503599631857032",
            "processDefinitionKey": "2251799813688817",
            "processInstanceKey": "4503599631857027",
            "formKey": "2251799813688818"
          }
        ],
        "page": {
          "totalItems": 1,
          "startCursor": "WzE3NTM2NzI4MjE2ODksNDUwMzU5OTYzMTg1NzAzM10=",
          "endCursor": "WzE3NTM2NzI4MjE2ODksNDUwMzU5OTYzMTg1NzAzM10="
        }
      }

      at test/test.spec.ts:65:13

    console.log
      task {
        "name": "Enter customer details",
        "state": "CREATED",
        "elementId": "Activity_1nouls1",
        "processDefinitionId": "test-tasks-query",
        "creationDate": "2025-07-28T03:20:21.689Z",
        "tenantId": "<default>",
        "processDefinitionVersion": 1,
        "customHeaders": {},
        "priority": 50,
        "userTaskKey": "4503599631857033",
        "elementInstanceKey": "4503599631857032",
        "processDefinitionKey": "2251799813688817",
        "processInstanceKey": "4503599631857027",
        "formKey": "2251799813688818"
      }

      at test/test.spec.ts:74:13

    console.log
      variables {
        "items": [],
        "page": {
          "totalItems": 0
        }
      }

      at test/test.spec.ts:83:13
```

## Additional detail

You can run the exact same test against a local instance of a Camunda 8.8.0-alpha6 container locally with the command:

```
npm test:local
```

This test does not fail after 25 runs. This seems to be an issue with the SaaS cluster only.

You can also run the same test against SaaS with code that awaits eventual consistency (`test/test-with-poll.spec.ts`) with the command: 

```
npm run test:saas:poll
```

When run with code that manages eventual consistency across the endpoints, this test passes reliably.

This is a clear indication that these endpoints are not strongly consistent on SaaS.

