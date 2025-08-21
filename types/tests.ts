import ParseServer, { FileSystemAdapter } from 'parse-server';
import Parse from 'parse/node';

async function server() {
  // $ExpectType ParseServer
  const parseServer = await ParseServer.startApp({});

  // $ExpectType void
  await parseServer.handleShutdown();

  // $ExpectType any
  parseServer.app;

  // $ExpectType any
  ParseServer.app({});

  // $ExpectType any
  ParseServer.promiseRouter({ appId: 'appId' });

  // $ExpectType ParseLiveQueryServer
  await ParseServer.createLiveQueryServer({}, {}, {});

  // $ExpectType any
  ParseServer.verifyServerUrl();

  // $ExpectError
  await ParseServer.startApp();

  // $ExpectError
  ParseServer.promiseRouter();

  // $ExpectError
  await ParseServer.createLiveQueryServer();

  // $ExpectType ParseServer
  const parseServer2 = new ParseServer({});

  // $ExpectType ParseServer
  await parseServer2.start();
}

function exports() {
  // $ExpectType any
  FileSystemAdapter;
}

function parsecloud() {
  Parse.Cloud.afterDelete('MyCustomClass', (request: Parse.Cloud.AfterDeleteRequest) => {
    // result
  });
  Parse.Cloud.afterSave('MyCustomClass', (request: Parse.Cloud.AfterSaveRequest) => {
    if (!request.context) {
      throw new Error('Request context should be defined');
    }
    // result
  });
  Parse.Cloud.beforeDelete('MyCustomClass', (request: Parse.Cloud.BeforeDeleteRequest) => {
    // result
  });
  Parse.Cloud.beforeDelete('MyCustomClass', async (request: Parse.Cloud.BeforeDeleteRequest) => {
    // result
  });
  Parse.Cloud.beforeSave('MyCustomClass', (request: Parse.Cloud.BeforeSaveRequest) => {
    if (request.object.isNew()) {
      if (!request.object.has('immutable')) throw new Error('Field immutable is required');
    } else {
      const original = request.original;
      if (original == null) {
        // When the object is not new, request.original must be defined
        throw new Error('Original must me defined for an existing object');
      }
      if (original.get('immutable') !== request.object.get('immutable')) {
        throw new Error('This field cannot be changed');
      }
    }
    if (!request.context) {
      throw new Error('Request context should be defined');
    }
  });
  Parse.Cloud.beforeFind('MyCustomClass', (request: Parse.Cloud.BeforeFindRequest) => {
    const query = request.query; // the Parse.Query
    const user = request.user; // the user
    const isMaster = request.master; // if the query is run with masterKey
    const isCount = request.count; // if the query is a count operation (available on parse-server 2.4.0 or up)
    const isGet = request.isGet; // if the query is a get operation
    // All possible read preferences
    request.readPreference = Parse.Cloud.ReadPreferenceOption.Primary;
    request.readPreference = Parse.Cloud.ReadPreferenceOption.PrimaryPreferred;
    request.readPreference = Parse.Cloud.ReadPreferenceOption.Secondary;
    request.readPreference = Parse.Cloud.ReadPreferenceOption.SecondaryPreferred;
    request.readPreference = Parse.Cloud.ReadPreferenceOption.Nearest;
  });
  Parse.Cloud.beforeFind('MyCustomClass', (request: Parse.Cloud.BeforeFindRequest) => {
    // const query = request.query; // the Parse.Query
    // return new Parse.Query('QueryMe!');
    return Promise.resolve();
  });
  Parse.Cloud.beforeFind('MyCustomClass', (request: Parse.Cloud.BeforeFindRequest) => {
    // const query = request.query; // the Parse.Query
    // return new Parse.Query('QueryMe, IN THE FUTURE!');
    return Promise.resolve();
  });
  Parse.Cloud.afterFind('MyCustomClass', (request: Parse.Cloud.AfterFindRequest) => {
    // return new Parse.Object('MyCustomClass');
    return Promise.resolve();
  });
  Parse.Cloud.beforeLogin((request: Parse.Cloud.TriggerRequest) => {
    return Promise.resolve();
  });
  Parse.Cloud.afterLogin((request: Parse.Cloud.TriggerRequest) => {
    return Promise.resolve();
  });
  Parse.Cloud.afterLogout((request: Parse.Cloud.TriggerRequest) => {
    return Promise.resolve();
  });
  Parse.Cloud.define('AFunc', (request: Parse.Cloud.FunctionRequest) => {
    return 'Some result';
  });
  Parse.Cloud.define(
    'AFunc',
    (request: Parse.Cloud.FunctionRequest) => {
      return 'Some result';
    },
    {
      requireUser: true,
      requireMaster: true,
      validateMasterKey: true,
      skipWithMasterKey: true,
      requireAnyUserRoles: ['a'],
      requireAllUserRoles: ['a'],
      fields: {
        name: {
          type: String,
          constant: true,
          default: true,
          options: [],
          error: 'invalid field.',
        },
      },
      requireUserKeys: {
        name: {
          type: String,
          constant: true,
          default: true,
          options: [],
          error: 'invalid field.',
        },
      },
    }
  );
  Parse.Cloud.define('AFunc', request => {
    // $ExpectType Params
    request.params;
    // $ExpectType any
    request.params.anything;
  });
  Parse.Cloud.define<() => void>('AFunc', request => {
    // $ExpectType {}
    request.params;
  });
  Parse.Cloud.define<(params: { something: string }) => number>('AFunc', request => {
    // $ExpectType Params
    request.params;
    // $ExpectType any
    request.params.somethingElse;
    return 123;
  });
  // $ExpectError
  Parse.Cloud.define('AFunc');
  // $ExpectError
  Parse.Cloud.define<() => string>('AFunc', () => 123);
  // $ExpectError
  Parse.Cloud.define<(params: string) => number>('AFunc', () => 123);
  Parse.Cloud.job('AJob', (request: Parse.Cloud.JobRequest) => {
    request.message('Message to associate with this job run');
  });

  Parse.Cloud.beforeConnect(async (request: Parse.Cloud.ConnectTriggerRequest) => {
    // code here
  });

  Parse.Cloud.beforeSubscribe('MyCustomClass', (request: any) => {
   // code here
  });

  Parse.Cloud.afterLiveQueryEvent('MyCustomClass', (request: Parse.Cloud.LiveQueryEventTrigger) => {
    // code here
  });
}
