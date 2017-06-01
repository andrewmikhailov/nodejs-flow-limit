# nodejs-flow-limit
## Technical introduction
The "nodejs-flow-limit" library allows injecting flow control points (wrappers / hooks) which react on parameters from the call tree.

## Instrumenting a micro-service call tree
While testing micro-services, it might be needed to control how the initial request to the API is processed by the lower-layer components which are handling the request.

But what to do when the request is passed many times from one component to another asynchronously without any knowledge of the request order? When we have many requests (e.g. from the load test, stress test or from real users) and each request is split into several micro-service calls - then it is not possible to track how the system behaves by usual tools.

Another use case is enforcing the correct execution order of calls happening within the service to simulate specific test conditions (e.g. race conditions for transactions).

Another consideration is that each micro-service may run on a separate server or in a separate Docker container.

Here is how we can instrument / debug a tree of micro-service calls:

- We find a place in the code which needs to be instrumented. Then we wrap this code with some useful handler depending on what we need to do for debugging the call tree.
- We assure that some specific call argument can be passed through the whole micro-service call tree so that data from this argument is available everywhere in the code.
- The callee (e.g. a unit test) appends special data argument to usual requests containing anything which is needed to trigger the instrumentation code.
- This data argument is then intercepted by the injected code and the proper action is performed.

The generic data flow for this use case is given on the diagram below:

![alt text](https://raw.githubusercontent.com/andrewmikhailov/nodejs-flow-limit/master/Documentation/micro-service+tree+synchronization.png)


## Synchronizing database requests to create race conditions
Let us say, we need to simulate two user queries to a database which target the same resource.

1. We add a wrapper to the database query code in the micro-service which handles this request.
2. We need to use the "redis-mutex" wrapper which delays code executions until the state of this wrapper is signaled in Redis.
3. The unit-test makes a call to the API front-end adding instrumentation context data to request #1 and #2.
4. The request is executed until the "redis-mutex" locks execution.
5. The unit-test signals the appropriate "redis-mutex" that the code can proceed.