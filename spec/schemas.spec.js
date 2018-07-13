'use strict';

const Parse = require('parse/node').Parse;
const request = require('request');
const rp = require('request-promise');
const dd = require('deep-diff');
const Config = require('../lib/Config');

let config;

const hasAllPODobject = () => {
  const obj = new Parse.Object('HasAllPOD');
  obj.set('aNumber', 5);
  obj.set('aString', 'string');
  obj.set('aBool', true);
  obj.set('aDate', new Date());
  obj.set('aObject', {k1: 'value', k2: true, k3: 5});
  obj.set('aArray', ['contents', true, 5]);
  obj.set('aGeoPoint', new Parse.GeoPoint({latitude: 0, longitude: 0}));
  obj.set('aFile', new Parse.File('f.txt', { base64: 'V29ya2luZyBhdCBQYXJzZSBpcyBncmVhdCE=' }));
  const objACL = new Parse.ACL();
  objACL.setPublicWriteAccess(false);
  obj.setACL(objACL);
  return obj;
};

const defaultClassLevelPermissions = {
  find: {
    '*': true
  },
  create: {
    '*': true
  },
  get: {
    '*': true
  },
  update: {
    '*': true
  },
  addField: {
    '*': true
  },
  delete: {
    '*': true
  }
}

const defaultIndex = {
  _id_: { _id: 1 },
};

const plainOldDataSchema = {
  className: 'HasAllPOD',
  fields: {
    //Default fields
    ACL: {type: 'ACL'},
    createdAt: {type: 'Date'},
    updatedAt: {type: 'Date'},
    objectId: {type: 'String'},
    //Custom fields
    aNumber: {type: 'Number'},
    aString: {type: 'String'},
    aBool: {type: 'Boolean'},
    aDate: {type: 'Date'},
    aObject: {type: 'Object'},
    aArray: {type: 'Array'},
    aGeoPoint: {type: 'GeoPoint'},
    aFile: {type: 'File'}
  },
  classLevelPermissions: defaultClassLevelPermissions
};

const pointersAndRelationsSchema = {
  className: 'HasPointersAndRelations',
  fields: {
    //Default fields
    ACL: {type: 'ACL'},
    createdAt: {type: 'Date'},
    updatedAt: {type: 'Date'},
    objectId: {type: 'String'},
    //Custom fields
    aPointer: {
      type: 'Pointer',
      targetClass: 'HasAllPOD',
    },
    aRelation: {
      type: 'Relation',
      targetClass: 'HasAllPOD',
    },
  },
  classLevelPermissions: defaultClassLevelPermissions
}

const userSchema = {
  "className": "_User",
  "fields": {
    "objectId": {"type": "String"},
    "createdAt": {"type": "Date"},
    "updatedAt": {"type": "Date"},
    "ACL": {"type": "ACL"},
    "username": {"type": "String"},
    "password": {"type": "String"},
    "email": {"type": "String"},
    "emailVerified": {"type": "Boolean"},
    "authData": {"type": "Object"}
  },
  "classLevelPermissions": defaultClassLevelPermissions,
  indexes: {
    _id_: { _id: 1 },
    email_1: { email: 1 },
    username_1: { username: 1 }
  },
};

const roleSchema = {
  "className": "_Role",
  "fields": {
    "objectId": {"type": "String"},
    "createdAt": {"type": "Date"},
    "updatedAt": {"type": "Date"},
    "ACL": {"type": "ACL"},
    "name":  {"type":"String"},
    "users": {"type":"Relation", "targetClass":"_User"},
    "roles": {"type":"Relation", "targetClass":"_Role"}
  },
  "classLevelPermissions": defaultClassLevelPermissions,
  indexes: {
    _id_: { _id: 1 },
    name_1: { name: 1 },
  },
};

const pgUserSchema = {
  "className": "_User",
  "fields": {
    "objectId": {"type": "String"},
    "createdAt": {"type": "Date"},
    "updatedAt": {"type": "Date"},
    "ACL": {"type": "ACL"},
    "username": {"type": "String"},
    "password": {"type": "String"},
    "email": {"type": "String"},
    "emailVerified": {"type": "Boolean"},
    "authData": {"type": "Object"}
  },
  "classLevelPermissions": defaultClassLevelPermissions,
  indexes: {
    _id_: { _id: 1 },
    unique_email: { email: 1 },
    unique_username: { username: 1 }
  },
};

const pgRoleSchema = {
  "className": "_Role",
  "fields": {
    "objectId": {"type": "String"},
    "createdAt": {"type": "Date"},
    "updatedAt": {"type": "Date"},
    "ACL": {"type": "ACL"},
    "name":  {"type":"String"},
    "users": {"type":"Relation", "targetClass":"_User"},
    "roles": {"type":"Relation", "targetClass":"_Role"}
  },
  "classLevelPermissions": defaultClassLevelPermissions,
  indexes: {
    _id_: { _id: 1 },
    unique_name: { name: 1 },
  },
};

const noAuthHeaders = {
  'X-Parse-Application-Id': 'test',
};

const restKeyHeaders = {
  'X-Parse-Application-Id': 'test',
  'X-Parse-REST-API-Key': 'rest',
};

const masterKeyHeaders = {
  'X-Parse-Application-Id': 'test',
  'X-Parse-Master-Key': 'test',
};

describe('schemas', () => {
  beforeEach(() => {
    config = Config.get('test');
  });

  afterEach(() => {
    config.database.schemaCache.clear();
  });

  it('requires the master key to get all schemas', (done) => {
    request.get({
      url: 'http://localhost:8378/1/schemas',
      json: true,
      headers: noAuthHeaders,
    }, (error, response, body) => {
      //api.parse.com uses status code 401, but due to the lack of keys
      //being necessary in parse-server, 403 makes more sense
      expect(response.statusCode).toEqual(403);
      expect(body.error).toEqual('unauthorized');
      done();
    });
  });

  it('requires the master key to get one schema', (done) => {
    request.get({
      url: 'http://localhost:8378/1/schemas/SomeSchema',
      json: true,
      headers: restKeyHeaders,
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(403);
      expect(body.error).toEqual('unauthorized: master key is required');
      done();
    });
  });

  it('asks for the master key if you use the rest key', (done) => {
    request.get({
      url: 'http://localhost:8378/1/schemas',
      json: true,
      headers: restKeyHeaders,
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(403);
      expect(body.error).toEqual('unauthorized: master key is required');
      done();
    });
  });

  it_only_db('mongo')('creates _User schema when server starts', done => {
    request.get({
      url: 'http://localhost:8378/1/schemas',
      json: true,
      headers: masterKeyHeaders,
    }, (error, response, body) => {
      const expected = {
        results: [userSchema, roleSchema]
      };
      expect(dd(body.results.sort((s1, s2) => s1.className > s2.className), expected.results.sort((s1, s2) => s1.className > s2.className))).toEqual(undefined);
      done();
    });
  });

  it_only_db('postgres')('creates _User schema when server starts', done => {
    request.get({
      url: 'http://localhost:8378/1/schemas',
      json: true,
      headers: masterKeyHeaders,
    }, (error, response, body) => {
      const expected = {
        results: [pgUserSchema, pgRoleSchema]
      };
      expect(dd(body.results.sort((s1, s2) => s1.className > s2.className), expected.results.sort((s1, s2) => s1.className > s2.className))).toEqual(undefined);
      done();
    });
  });

  it_only_db('mongo')('responds with a list of schemas after creating objects', done => {
    const obj1 = hasAllPODobject();
    obj1.save().then(savedObj1 => {
      const obj2 = new Parse.Object('HasPointersAndRelations');
      obj2.set('aPointer', savedObj1);
      const relation = obj2.relation('aRelation');
      relation.add(obj1);
      return obj2.save();
    }).then(() => {
      request.get({
        url: 'http://localhost:8378/1/schemas',
        json: true,
        headers: masterKeyHeaders,
      }, (error, response, body) => {
        const expected = {
          results: [userSchema,roleSchema,plainOldDataSchema,pointersAndRelationsSchema]
        };
        expect(dd(body.results.sort((s1, s2) => s1.className > s2.className), expected.results.sort((s1, s2) => s1.className > s2.className))).toEqual(undefined);
        done();
      })
    });
  });

  it_only_db('postgres')('responds with a list of schemas after creating objects', done => {
    const obj1 = hasAllPODobject();
    obj1.save().then(savedObj1 => {
      const obj2 = new Parse.Object('HasPointersAndRelations');
      obj2.set('aPointer', savedObj1);
      const relation = obj2.relation('aRelation');
      relation.add(obj1);
      return obj2.save();
    }).then(() => {
      request.get({
        url: 'http://localhost:8378/1/schemas',
        json: true,
        headers: masterKeyHeaders,
      }, (error, response, body) => {
        const expected = {
          results: [pgUserSchema,pgRoleSchema,plainOldDataSchema,pointersAndRelationsSchema]
        };
        expect(dd(body.results.sort((s1, s2) => s1.className > s2.className), expected.results.sort((s1, s2) => s1.className > s2.className))).toEqual(undefined);
        done();
      })
    });
  });

  it('responds with a single schema', done => {
    const obj = hasAllPODobject();
    obj.save().then(() => {
      request.get({
        url: 'http://localhost:8378/1/schemas/HasAllPOD',
        json: true,
        headers: masterKeyHeaders,
      }, (error, response, body) => {
        expect(body).toEqual(plainOldDataSchema);
        done();
      });
    });
  });

  it('treats class names case sensitively', done => {
    const obj = hasAllPODobject();
    obj.save().then(() => {
      request.get({
        url: 'http://localhost:8378/1/schemas/HASALLPOD',
        json: true,
        headers: masterKeyHeaders,
      }, (error, response, body) => {
        expect(response.statusCode).toEqual(400);
        expect(body).toEqual({
          code: 103,
          error: 'Class HASALLPOD does not exist.',
        });
        done();
      });
    });
  });

  it('requires the master key to create a schema', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas',
      json: true,
      headers: noAuthHeaders,
      body: {
        className: 'MyClass',
      }
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(403);
      expect(body.error).toEqual('unauthorized');
      done();
    });
  });

  it('asks for the master key if you use the rest key', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas',
      json: true,
      headers: restKeyHeaders,
      body: {
        className: 'MyClass',
      },
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(403);
      expect(body.error).toEqual('unauthorized: master key is required');
      done();
    });
  });

  it('sends an error if you use mismatching class names', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/A',
      headers: masterKeyHeaders,
      json: true,
      body: {
        className: 'B',
      }
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(400);
      expect(body).toEqual({
        code: Parse.Error.INVALID_CLASS_NAME,
        error: 'Class name mismatch between B and A.',
      });
      done();
    });
  });

  it('sends an error if you use no class name', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas',
      headers: masterKeyHeaders,
      json: true,
      body: {},
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(400);
      expect(body).toEqual({
        code: 135,
        error: 'POST /schemas needs a class name.',
      });
      done();
    })
  });

  it('sends an error if you try to create the same class twice', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas',
      headers: masterKeyHeaders,
      json: true,
      body: {
        className: 'A',
      },
    }, (error) => {
      expect(error).toEqual(null);
      request.post({
        url: 'http://localhost:8378/1/schemas',
        headers: masterKeyHeaders,
        json: true,
        body: {
          className: 'A',
        }
      }, (error, response, body) => {
        expect(response.statusCode).toEqual(400);
        expect(body).toEqual({
          code: Parse.Error.INVALID_CLASS_NAME,
          error: 'Class A already exists.'
        });
        done();
      });
    });
  });

  it('responds with all fields when you create a class', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas',
      headers: masterKeyHeaders,
      json: true,
      body: {
        className: "NewClass",
        fields: {
          foo: {type: 'Number'},
          ptr: {type: 'Pointer', targetClass: 'SomeClass'}
        }
      }
    }, (error, response, body) => {
      expect(body).toEqual({
        className: 'NewClass',
        fields: {
          ACL: {type: 'ACL'},
          createdAt: {type: 'Date'},
          updatedAt: {type: 'Date'},
          objectId: {type: 'String'},
          foo: {type: 'Number'},
          ptr: {type: 'Pointer', targetClass: 'SomeClass'},
        },
        classLevelPermissions: defaultClassLevelPermissions,
        indexes: defaultIndex,
      });
      done();
    });
  });

  it('responds with all fields when getting incomplete schema', done => {
    config.database.loadSchema()
      .then(schemaController => schemaController.addClassIfNotExists('_Installation', {}, defaultClassLevelPermissions))
      .then(() => {
        request.get({
          url: 'http://localhost:8378/1/schemas/_Installation',
          headers: masterKeyHeaders,
          json: true
        }, (error, response, body) => {
          expect(dd(body,{
            className: '_Installation',
            fields: {
              objectId: {type: 'String'},
              updatedAt: {type: 'Date'},
              createdAt: {type: 'Date'},
              installationId: {type: 'String'},
              deviceToken: {type: 'String'},
              channels: {type: 'Array'},
              deviceType: {type: 'String'},
              pushType: {type: 'String'},
              GCMSenderId: {type: 'String'},
              timeZone: {type: 'String'},
              badge: {type: 'Number'},
              appIdentifier: {type: 'String'},
              localeIdentifier: {type: 'String'},
              appVersion: {type: 'String'},
              appName: {type: 'String'},
              parseVersion: {type: 'String'},
              ACL: {type: 'ACL'}
            },
            classLevelPermissions: defaultClassLevelPermissions
          })).toBeUndefined();
          done();
        });
      })
      .catch(error => {
        fail(JSON.stringify(error))
        done();
      });
  });

  it('lets you specify class name in both places', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/NewClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        className: "NewClass",
      }
    }, (error, response, body) => {
      expect(body).toEqual({
        className: 'NewClass',
        fields: {
          ACL: {type: 'ACL'},
          createdAt: {type: 'Date'},
          updatedAt: {type: 'Date'},
          objectId: {type: 'String'},
        },
        classLevelPermissions: defaultClassLevelPermissions,
        indexes: defaultIndex,
      });
      done();
    });
  });

  it('requires the master key to modify schemas', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/NewClass',
      headers: masterKeyHeaders,
      json: true,
      body: {},
    }, () => {
      request.put({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: noAuthHeaders,
        json: true,
        body: {},
      }, (error, response, body) => {
        expect(response.statusCode).toEqual(403);
        expect(body.error).toEqual('unauthorized');
        done();
      });
    });
  });

  it('rejects class name mis-matches in put', done => {
    request.put({
      url: 'http://localhost:8378/1/schemas/NewClass',
      headers: masterKeyHeaders,
      json: true,
      body: {className: 'WrongClassName'}
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(400);
      expect(body.code).toEqual(Parse.Error.INVALID_CLASS_NAME);
      expect(body.error).toEqual('Class name mismatch between WrongClassName and NewClass.');
      done();
    });
  });

  it('refuses to add fields to non-existent classes', done => {
    request.put({
      url: 'http://localhost:8378/1/schemas/NoClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        fields: {
          newField: {type: 'String'}
        }
      }
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(400);
      expect(body.code).toEqual(Parse.Error.INVALID_CLASS_NAME);
      expect(body.error).toEqual('Class NoClass does not exist.');
      done();
    });
  });

  it('refuses to put to existing fields, even if it would not be a change', done => {
    const obj = hasAllPODobject();
    obj.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/HasAllPOD',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'}
            }
          }
        }, (error, response, body) => {
          expect(response.statusCode).toEqual(400);
          expect(body.code).toEqual(255);
          expect(body.error).toEqual('Field aString exists, cannot update.');
          done();
        });
      })
  });

  it('refuses to delete non-existent fields', done => {
    const obj = hasAllPODobject();
    obj.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/HasAllPOD',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              nonExistentKey: {__op: "Delete"},
            }
          }
        }, (error, response, body) => {
          expect(response.statusCode).toEqual(400);
          expect(body.code).toEqual(255);
          expect(body.error).toEqual('Field nonExistentKey does not exist, cannot delete.');
          done();
        });
      });
  });

  it('refuses to add a geopoint to a class that already has one', done => {
    const obj = hasAllPODobject();
    obj.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/HasAllPOD',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              newGeo: {type: 'GeoPoint'}
            }
          }
        }, (error, response, body) => {
          expect(response.statusCode).toEqual(400);
          expect(body.code).toEqual(Parse.Error.INCORRECT_TYPE);
          expect(body.error).toEqual('currently, only one GeoPoint field may exist in an object. Adding newGeo when aGeoPoint already exists.');
          done();
        });
      });
  });

  it('refuses to add two geopoints', done => {
    const obj = new Parse.Object('NewClass');
    obj.set('aString', 'aString');
    obj.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              newGeo1: {type: 'GeoPoint'},
              newGeo2: {type: 'GeoPoint'},
            }
          }
        }, (error, response, body) => {
          expect(response.statusCode).toEqual(400);
          expect(body.code).toEqual(Parse.Error.INCORRECT_TYPE);
          expect(body.error).toEqual('currently, only one GeoPoint field may exist in an object. Adding newGeo2 when newGeo1 already exists.');
          done();
        });
      });
  });

  it('allows you to delete and add a geopoint in the same request', done => {
    const obj = new Parse.Object('NewClass');
    obj.set('geo1', new Parse.GeoPoint({latitude: 0, longitude: 0}));
    obj.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              geo2: {type: 'GeoPoint'},
              geo1: {__op: 'Delete'}
            }
          }
        }, (error, response, body) => {
          expect(dd(body, {
            "className": "NewClass",
            "fields": {
              "ACL": {"type": "ACL"},
              "createdAt": {"type": "Date"},
              "objectId": {"type": "String"},
              "updatedAt": {"type": "Date"},
              "geo2": {"type": "GeoPoint"},
            },
            classLevelPermissions: defaultClassLevelPermissions
          })).toEqual(undefined);
          done();
        });
      })
  });

  it('put with no modifications returns all fields', done => {
    const obj = hasAllPODobject();
    obj.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/HasAllPOD',
          headers: masterKeyHeaders,
          json: true,
          body: {},
        }, (error, response, body) => {
          expect(body).toEqual(plainOldDataSchema);
          done();
        });
      })
  });

  it('lets you add fields', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/NewClass',
      headers: masterKeyHeaders,
      json: true,
      body: {},
    }, () => {
      request.put({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {
          fields: {
            newField: {type: 'String'}
          }
        }
      }, (error, response, body) => {
        expect(dd(body, {
          className: 'NewClass',
          fields: {
            "ACL": {"type": "ACL"},
            "createdAt": {"type": "Date"},
            "objectId": {"type": "String"},
            "updatedAt": {"type": "Date"},
            "newField": {"type": "String"},
          },
          classLevelPermissions: defaultClassLevelPermissions,
          indexes: defaultIndex,
        })).toEqual(undefined);
        request.get({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
        }, (error, response, body) => {
          expect(body).toEqual({
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              newField: {type: 'String'},
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: defaultIndex,
          });
          done();
        });
      });
    })
  });

  it_only_db('mongo')('lets you add fields to system schema', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/_User',
      headers: masterKeyHeaders,
      json: true
    }, () => {
      request.put({
        url: 'http://localhost:8378/1/schemas/_User',
        headers: masterKeyHeaders,
        json: true,
        body: {
          fields: {
            newField: {type: 'String'}
          }
        }
      }, (error, response, body) => {
        expect(dd(body,{
          className: '_User',
          fields: {
            objectId: {type: 'String'},
            updatedAt: {type: 'Date'},
            createdAt: {type: 'Date'},
            username: {type: 'String'},
            password: {type: 'String'},
            email: {type: 'String'},
            emailVerified: {type: 'Boolean'},
            authData: {type: 'Object'},
            newField: {type: 'String'},
            ACL: {type: 'ACL'}
          },
          classLevelPermissions: defaultClassLevelPermissions,
          indexes: {
            _id_: { _id: 1 },
            email_1: { email: 1 },
            username_1: { username: 1 }
          },
        })).toBeUndefined();
        request.get({
          url: 'http://localhost:8378/1/schemas/_User',
          headers: masterKeyHeaders,
          json: true
        }, (error, response, body) => {
          expect(dd(body,{
            className: '_User',
            fields: {
              objectId: {type: 'String'},
              updatedAt: {type: 'Date'},
              createdAt: {type: 'Date'},
              username: {type: 'String'},
              password: {type: 'String'},
              email: {type: 'String'},
              emailVerified: {type: 'Boolean'},
              authData: {type: 'Object'},
              newField: {type: 'String'},
              ACL: {type: 'ACL'}
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              email_1: { email: 1 },
              username_1: { username: 1 }
            },
          })).toBeUndefined();
          done();
        });
      });
    })
  });

  it_only_db('postgres')('lets you add fields to system schema', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/_User',
      headers: masterKeyHeaders,
      json: true
    }, () => {
      request.put({
        url: 'http://localhost:8378/1/schemas/_User',
        headers: masterKeyHeaders,
        json: true,
        body: {
          fields: {
            newField: {type: 'String'}
          }
        }
      }, (error, response, body) => {
        expect(dd(body,{
          className: '_User',
          fields: {
            objectId: {type: 'String'},
            updatedAt: {type: 'Date'},
            createdAt: {type: 'Date'},
            username: {type: 'String'},
            password: {type: 'String'},
            email: {type: 'String'},
            emailVerified: {type: 'Boolean'},
            authData: {type: 'Object'},
            newField: {type: 'String'},
            ACL: {type: 'ACL'}
          },
          classLevelPermissions: defaultClassLevelPermissions,
          indexes: {
            _id_: { _id: 1 },
            unique_email: { email: 1 },
            unique_username: { username: 1 }
          },
        })).toBeUndefined();
        request.get({
          url: 'http://localhost:8378/1/schemas/_User',
          headers: masterKeyHeaders,
          json: true
        }, (error, response, body) => {
          expect(dd(body,{
            className: '_User',
            fields: {
              objectId: {type: 'String'},
              updatedAt: {type: 'Date'},
              createdAt: {type: 'Date'},
              username: {type: 'String'},
              password: {type: 'String'},
              email: {type: 'String'},
              emailVerified: {type: 'Boolean'},
              authData: {type: 'Object'},
              newField: {type: 'String'},
              ACL: {type: 'ACL'}
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              unique_email: { email: 1 },
              unique_username: { username: 1 }
            },
          })).toBeUndefined();
          done();
        });
      });
    })
  });

  it('lets you delete multiple fields and check schema', done => {
    const simpleOneObject = () => {
      const obj = new Parse.Object('SimpleOne');
      obj.set('aNumber', 5);
      obj.set('aString', 'string');
      obj.set('aBool', true);
      return obj;
    };

    simpleOneObject().save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/SimpleOne',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {__op: 'Delete'},
              aNumber: {__op: 'Delete'},
            }
          }
        }, (error, response, body) => {
          expect(body).toEqual({
            className: 'SimpleOne',
            fields: {
              //Default fields
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              //Custom fields
              aBool: {type: 'Boolean'},
            },
            classLevelPermissions: defaultClassLevelPermissions
          });

          done();
        });
      });
  });

  it('lets you delete multiple fields and add fields', done => {
    const obj1 = hasAllPODobject();
    obj1.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/HasAllPOD',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {__op: 'Delete'},
              aNumber: {__op: 'Delete'},
              aNewString: {type: 'String'},
              aNewNumber: {type: 'Number'},
              aNewRelation: {type: 'Relation', targetClass: 'HasAllPOD'},
              aNewPointer: {type: 'Pointer', targetClass: 'HasAllPOD'},
            }
          }
        }, (error, response, body) => {
          expect(body).toEqual({
            className: 'HasAllPOD',
            fields: {
            //Default fields
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              //Custom fields
              aBool: {type: 'Boolean'},
              aDate: {type: 'Date'},
              aObject: {type: 'Object'},
              aArray: {type: 'Array'},
              aGeoPoint: {type: 'GeoPoint'},
              aFile: {type: 'File'},
              aNewNumber: {type: 'Number'},
              aNewString: {type: 'String'},
              aNewPointer: {type: 'Pointer', targetClass: 'HasAllPOD'},
              aNewRelation: {type: 'Relation', targetClass: 'HasAllPOD'},
            },
            classLevelPermissions: defaultClassLevelPermissions
          });
          const obj2 = new Parse.Object('HasAllPOD');
          obj2.set('aNewPointer', obj1);
          const relation = obj2.relation('aNewRelation');
          relation.add(obj1);
          obj2.save().then(done); //Just need to make sure saving works on the new object.
        });
      });
  });

  it('will not delete any fields if the additions are invalid', done => {
    const obj = hasAllPODobject();
    obj.save()
      .then(() => {
        request.put({
          url: 'http://localhost:8378/1/schemas/HasAllPOD',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              fakeNewField: {type: 'fake type'},
              aString: {__op: 'Delete'}
            }
          }
        }, (error, response, body) => {
          expect(body.code).toEqual(Parse.Error.INCORRECT_TYPE);
          expect(body.error).toEqual('invalid field type: fake type');
          request.get({
            url: 'http://localhost:8378/1/schemas/HasAllPOD',
            headers: masterKeyHeaders,
            json: true,
          }, (error, response) => {
            expect(response.body).toEqual(plainOldDataSchema);
            done();
          });
        });
      });
  });

  it('requires the master key to delete schemas', done => {
    request.del({
      url: 'http://localhost:8378/1/schemas/DoesntMatter',
      headers: noAuthHeaders,
      json: true,
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(403);
      expect(body.error).toEqual('unauthorized');
      done();
    });
  });

  it('refuses to delete non-empty collection', done => {
    const obj = hasAllPODobject();
    obj.save()
      .then(() => {
        request.del({
          url: 'http://localhost:8378/1/schemas/HasAllPOD',
          headers: masterKeyHeaders,
          json: true,
        }, (error, response, body) => {
          expect(response.statusCode).toEqual(400);
          expect(body.code).toEqual(255);
          expect(body.error).toMatch(/HasAllPOD/);
          expect(body.error).toMatch(/contains 1/);
          done();
        });
      });
  });

  it('fails when deleting collections with invalid class names', done => {
    request.del({
      url: 'http://localhost:8378/1/schemas/_GlobalConfig',
      headers: masterKeyHeaders,
      json: true,
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(400);
      expect(body.code).toEqual(Parse.Error.INVALID_CLASS_NAME);
      expect(body.error).toEqual('Invalid classname: _GlobalConfig, classnames can only have alphanumeric characters and _, and must start with an alpha character ');
      done();
    })
  });

  it('does not fail when deleting nonexistant collections', done => {
    request.del({
      url: 'http://localhost:8378/1/schemas/Missing',
      headers: masterKeyHeaders,
      json: true,
    }, (error, response, body) => {
      expect(response.statusCode).toEqual(200);
      expect(body).toEqual({});
      done();
    });
  });

  it('deletes collections including join tables', done => {
    const obj = new Parse.Object('MyClass');
    obj.set('data', 'data');
    obj.save()
      .then(() => {
        const obj2 = new Parse.Object('MyOtherClass');
        const relation = obj2.relation('aRelation');
        relation.add(obj);
        return obj2.save();
      })
      .then(obj2 => obj2.destroy())
      .then(() => {
        request.del({
          url: 'http://localhost:8378/1/schemas/MyOtherClass',
          headers: masterKeyHeaders,
          json: true,
        }, (error, response) => {
          expect(response.statusCode).toEqual(200);
          expect(response.body).toEqual({});
          config.database.collectionExists('_Join:aRelation:MyOtherClass').then(exists => {
            if (exists) {
              fail('Relation collection should be deleted.');
              done();
            }
            return config.database.collectionExists('MyOtherClass');
          }).then(exists => {
            if (exists) {
              fail('Class collection should be deleted.');
              done();
            }
          }).then(() => {
            request.get({
              url: 'http://localhost:8378/1/schemas/MyOtherClass',
              headers: masterKeyHeaders,
              json: true,
            }, (error, response, body) => {
            //Expect _SCHEMA entry to be gone.
              expect(response.statusCode).toEqual(400);
              expect(body.code).toEqual(Parse.Error.INVALID_CLASS_NAME);
              expect(body.error).toEqual('Class MyOtherClass does not exist.');
              done();
            });
          });
        });
      }).then(() => {
      }, error => {
        fail(error);
        done();
      });
  });

  it('deletes schema when actual collection does not exist', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/NewClassForDelete',
      headers: masterKeyHeaders,
      json: true,
      body: {
        className: 'NewClassForDelete'
      }
    }, (error, response) => {
      expect(error).toEqual(null);
      expect(response.body.className).toEqual('NewClassForDelete');
      request.del({
        url: 'http://localhost:8378/1/schemas/NewClassForDelete',
        headers: masterKeyHeaders,
        json: true,
      }, (error, response) => {
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({});
        config.database.loadSchema().then(schema => {
          schema.hasClass('NewClassForDelete').then(exist => {
            expect(exist).toEqual(false);
            done();
          });
        })
      });
    });
  });

  it('deletes schema when actual collection exists', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/NewClassForDelete',
      headers: masterKeyHeaders,
      json: true,
      body: {
        className: 'NewClassForDelete'
      }
    }, (error, response) => {
      expect(error).toEqual(null);
      expect(response.body.className).toEqual('NewClassForDelete');
      request.post({
        url: 'http://localhost:8378/1/classes/NewClassForDelete',
        headers: restKeyHeaders,
        json: true
      }, (error, response) => {
        expect(error).toEqual(null);
        expect(typeof response.body.objectId).toEqual('string');
        request.del({
          url: 'http://localhost:8378/1/classes/NewClassForDelete/' + response.body.objectId,
          headers: restKeyHeaders,
          json: true,
        }, (error) => {
          expect(error).toEqual(null);
          request.del({
            url: 'http://localhost:8378/1/schemas/NewClassForDelete',
            headers: masterKeyHeaders,
            json: true,
          }, (error, response) => {
            expect(response.statusCode).toEqual(200);
            expect(response.body).toEqual({});
            config.database.loadSchema().then(schema => {
              schema.hasClass('NewClassForDelete').then(exist => {
                expect(exist).toEqual(false);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should set/get schema permissions', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            '*': true
          },
          create: {
            'role:admin': true
          }
        }
      }
    }, (error) => {
      expect(error).toEqual(null);
      request.get({
        url: 'http://localhost:8378/1/schemas/AClass',
        headers: masterKeyHeaders,
        json: true,
      }, (error, response) => {
        expect(response.statusCode).toEqual(200);
        expect(response.body.classLevelPermissions).toEqual({
          find: {
            '*': true
          },
          create: {
            'role:admin': true
          },
          get: {},
          update: {},
          delete: {},
          addField: {}
        });
        done();
      });
    });
  });

  it('should fail setting schema permissions with invalid key', done => {

    const object = new Parse.Object('AClass');
    object.save().then(() => {
      request.put({
        url: 'http://localhost:8378/1/schemas/AClass',
        headers: masterKeyHeaders,
        json: true,
        body: {
          classLevelPermissions: {
            find: {
              '*': true
            },
            create: {
              'role:admin': true
            },
            dummy: {
              'some': true
            }
          }
        }
      }, (error, response, body) => {
        expect(error).toEqual(null);
        expect(body.code).toEqual(107);
        expect(body.error).toEqual('dummy is not a valid operation for class level permissions');
        done();
      });
    });
  });

  it('should not be able to add a field', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          create: {
            '*': true
          },
          find: {
            '*': true
          },
          addField: {
            'role:admin': true
          }
        }
      }
    }, (error) => {
      expect(error).toEqual(null);
      const object = new Parse.Object('AClass');
      object.set('hello', 'world');
      return object.save().then(() => {
        fail('should not be able to add a field');
        done();
      }, (err) => {
        expect(err.message).toEqual('Permission denied for action addField on class AClass.');
        done();
      })
    })
  });

  it('should be able to add a field', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          create: {
            '*': true
          },
          addField: {
            '*': true
          }
        }
      }
    }, (error) => {
      expect(error).toEqual(null);
      const object = new Parse.Object('AClass');
      object.set('hello', 'world');
      return object.save().then(() => {
        done();
      }, () => {
        fail('should be able to add a field');
        done();
      })
    })
  });

  it('should throw with invalid userId (>10 chars)', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            '1234567890A': true
          },
        }
      }
    }, (error, response, body) => {
      expect(body.error).toEqual("'1234567890A' is not a valid key for class level permissions");
      done();
    })
  });

  it('should throw with invalid userId (<10 chars)', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            'a12345678': true
          },
        }
      }
    }, (error, response, body) => {
      expect(body.error).toEqual("'a12345678' is not a valid key for class level permissions");
      done();
    })
  });

  it('should throw with invalid userId (invalid char)', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            '12345_6789': true
          },
        }
      }
    }, (error, response, body) => {
      expect(body.error).toEqual("'12345_6789' is not a valid key for class level permissions");
      done();
    })
  });

  it('should throw with invalid * (spaces before)', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            ' *': true
          },
        }
      }
    }, (error, response, body) => {
      expect(body.error).toEqual("' *' is not a valid key for class level permissions");
      done();
    })
  });

  it('should throw with invalid * (spaces after)', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            '* ': true
          },
        }
      }
    }, (error, response, body) => {
      expect(body.error).toEqual("'* ' is not a valid key for class level permissions");
      done();
    })
  });

  it('should throw with invalid value', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            '*': 1
          },
        }
      }
    }, (error, response, body) => {
      expect(body.error).toEqual("'1' is not a valid value for class level permissions find:*:1");
      done();
    })
  });

  it('should throw with invalid value', done => {
    request.post({
      url: 'http://localhost:8378/1/schemas/AClass',
      headers: masterKeyHeaders,
      json: true,
      body: {
        classLevelPermissions: {
          find: {
            '*': ""
          },
        }
      }
    }, (error, response, body) => {
      expect(body.error).toEqual("'' is not a valid value for class level permissions find:*:");
      done();
    })
  });

  function setPermissionsOnClass(className, permissions, doPut) {
    let op = request.post;
    if (doPut)
    {
      op = request.put;
    }
    return new Promise((resolve, reject) => {
      op({
        url: 'http://localhost:8378/1/schemas/' + className,
        headers: masterKeyHeaders,
        json: true,
        body: {
          classLevelPermissions: permissions
        }
      }, (error, response, body) => {
        if (error) {
          return reject(error);
        }
        if (body.error) {
          return reject(body);
        }
        return resolve(body);
      })
    });
  }

  it('validate CLP 1', done => {
    const user = new Parse.User();
    user.setUsername('user');
    user.setPassword('user');

    const admin = new Parse.User();
    admin.setUsername('admin');
    admin.setPassword('admin');

    const role = new Parse.Role('admin', new Parse.ACL());

    setPermissionsOnClass('AClass', {
      'find': {
        'role:admin': true
      }
    }).then(() => {
      return Parse.Object.saveAll([user, admin, role], {useMasterKey: true});
    }).then(()=> {
      role.relation('users').add(admin);
      return role.save(null, {useMasterKey: true});
    }).then(() => {
      return Parse.User.logIn('user', 'user').then(() => {
        const obj = new Parse.Object('AClass');
        return obj.save(null, {useMasterKey: true});
      })
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then(() => {
        fail('Use should hot be able to find!')
      }, (err) => {
        expect(err.message).toEqual('Permission denied for action find on class AClass.');
        return Promise.resolve();
      })
    }).then(() => {
      return Parse.User.logIn('admin', 'admin');
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find();
    }).then((results) => {
      expect(results.length).toBe(1);
      done();
    }).catch((err) => {
      jfail(err);
      done();
    })
  });

  it('validate CLP 2', done => {
    const user = new Parse.User();
    user.setUsername('user');
    user.setPassword('user');

    const admin = new Parse.User();
    admin.setUsername('admin');
    admin.setPassword('admin');

    const role = new Parse.Role('admin', new Parse.ACL());

    setPermissionsOnClass('AClass', {
      'find': {
        'role:admin': true
      }
    }).then(() => {
      return Parse.Object.saveAll([user, admin, role], {useMasterKey: true});
    }).then(()=> {
      role.relation('users').add(admin);
      return role.save(null, {useMasterKey: true});
    }).then(() => {
      return Parse.User.logIn('user', 'user').then(() => {
        const obj = new Parse.Object('AClass');
        return obj.save(null, {useMasterKey: true});
      })
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then(() => {
        fail('User should not be able to find!')
      }, (err) => {
        expect(err.message).toEqual('Permission denied for action find on class AClass.');
        return Promise.resolve();
      })
    }).then(() => {
      // let everyone see it now
      return setPermissionsOnClass('AClass', {
        'find': {
          'role:admin': true,
          '*': true
        }
      }, true);
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then((result) => {
        expect(result.length).toBe(1);
      }, () => {
        fail('User should be able to find!')
        done();
      });
    }).then(() => {
      return Parse.User.logIn('admin', 'admin');
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find();
    }).then((results) => {
      expect(results.length).toBe(1);
      done();
    }).catch((err) => {
      jfail(err);
      done();
    })
  });

  it('validate CLP 3', done => {
    const user = new Parse.User();
    user.setUsername('user');
    user.setPassword('user');

    const admin = new Parse.User();
    admin.setUsername('admin');
    admin.setPassword('admin');

    const role = new Parse.Role('admin', new Parse.ACL());

    setPermissionsOnClass('AClass', {
      'find': {
        'role:admin': true
      }
    }).then(() => {
      return Parse.Object.saveAll([user, admin, role], {useMasterKey: true});
    }).then(()=> {
      role.relation('users').add(admin);
      return role.save(null, {useMasterKey: true});
    }).then(() => {
      return Parse.User.logIn('user', 'user').then(() => {
        const obj = new Parse.Object('AClass');
        return obj.save(null, {useMasterKey: true});
      })
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then(() => {
        fail('User should not be able to find!')
      }, (err) => {
        expect(err.message).toEqual('Permission denied for action find on class AClass.');
        return Promise.resolve();
      })
    }).then(() => {
      // delete all CLP
      return setPermissionsOnClass('AClass', null, true);
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then((result) => {
        expect(result.length).toBe(1);
      }, () => {
        fail('User should be able to find!')
        done();
      });
    }).then(() => {
      return Parse.User.logIn('admin', 'admin');
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find();
    }).then((results) => {
      expect(results.length).toBe(1);
      done();
    }).catch((err) => {
      jfail(err);
      done();
    });
  });

  it('validate CLP 4', done => {
    const user = new Parse.User();
    user.setUsername('user');
    user.setPassword('user');

    const admin = new Parse.User();
    admin.setUsername('admin');
    admin.setPassword('admin');

    const role = new Parse.Role('admin', new Parse.ACL());

    setPermissionsOnClass('AClass', {
      'find': {
        'role:admin': true
      }
    }).then(() => {
      return Parse.Object.saveAll([user, admin, role], {useMasterKey: true});
    }).then(()=> {
      role.relation('users').add(admin);
      return role.save(null, {useMasterKey: true});
    }).then(() => {
      return Parse.User.logIn('user', 'user').then(() => {
        const obj = new Parse.Object('AClass');
        return obj.save(null, {useMasterKey: true});
      })
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then(() => {
        fail('User should not be able to find!')
      }, (err) => {
        expect(err.message).toEqual('Permission denied for action find on class AClass.');
        return Promise.resolve();
      })
    }).then(() => {
      // borked CLP should not affec security
      return setPermissionsOnClass('AClass', {
        'found': {
          'role:admin': true
        }
      }, true).then(() => {
        fail("Should not be able to save a borked CLP");
      }, () => {
        return Promise.resolve();
      })
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then(() => {
        fail('User should not be able to find!')
      }, (err) => {
        expect(err.message).toEqual('Permission denied for action find on class AClass.');
        return Promise.resolve();
      });
    }).then(() => {
      return Parse.User.logIn('admin', 'admin');
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find();
    }).then((results) => {
      expect(results.length).toBe(1);
      done();
    }).catch((err) => {
      jfail(err);
      done();
    })
  });

  it('validate CLP 5', done => {
    const user = new Parse.User();
    user.setUsername('user');
    user.setPassword('user');

    const user2 = new Parse.User();
    user2.setUsername('user2');
    user2.setPassword('user2');
    const admin = new Parse.User();
    admin.setUsername('admin');
    admin.setPassword('admin');

    const role = new Parse.Role('admin', new Parse.ACL());

    Promise.resolve().then(() => {
      return Parse.Object.saveAll([user, user2, admin, role], {useMasterKey: true});
    }).then(()=> {
      role.relation('users').add(admin);
      return role.save(null, {useMasterKey: true}).then(() => {
        const perm = {
          find: {}
        };
        // let the user find
        perm['find'][user.id] = true;
        return setPermissionsOnClass('AClass', perm);
      })
    }).then(() => {
      return Parse.User.logIn('user', 'user').then(() => {
        const obj = new Parse.Object('AClass');
        return obj.save();
      })
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find().then((res) => {
        expect(res.length).toEqual(1);
      }, () => {
        fail('User should be able to find!')
        return Promise.resolve();
      })
    }).then(() => {
      return Parse.User.logIn('admin', 'admin');
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find();
    }).then(() => {
      fail("should not be able to read!");
      return Promise.resolve();
    }, (err) => {
      expect(err.message).toEqual('Permission denied for action create on class AClass.');
      return Promise.resolve();
    }).then(() => {
      return Parse.User.logIn('user2', 'user2');
    }).then(() => {
      const query = new Parse.Query('AClass');
      return query.find();
    }).then(() => {
      fail("should not be able to read!");
      return Promise.resolve();
    }, (err) => {
      expect(err.message).toEqual('Permission denied for action find on class AClass.');
      return Promise.resolve();
    }).then(() => {
      done();
    });
  });

  it('can query with include and CLP (issue #2005)', (done) => {
    setPermissionsOnClass('AnotherObject', {
      get: {"*": true},
      find: {},
      create: {'*': true},
      update: {'*': true},
      delete: {'*': true},
      addField:{'*': true}
    }).then(() => {
      const obj = new Parse.Object('AnObject');
      const anotherObject = new Parse.Object('AnotherObject');
      return obj.save({
        anotherObject
      })
    }).then(() => {
      const query = new Parse.Query('AnObject');
      query.include('anotherObject');
      return query.find();
    }).then((res) => {
      expect(res.length).toBe(1);
      expect(res[0].get('anotherObject')).not.toBeUndefined();
      done();
    }).catch((err) => {
      jfail(err);
      done();
    })
  });

  it('can add field as master (issue #1257)', (done) => {
    setPermissionsOnClass('AClass', {
      'addField': {}
    }).then(() => {
      const obj = new Parse.Object('AClass');
      obj.set('key', 'value');
      return obj.save(null, {useMasterKey: true})
    }).then((obj) => {
      expect(obj.get('key')).toEqual('value');
      done();
    }, () => {
      fail('should not fail');
      done();
    });
  });

  it('can login when addFields is false (issue #1355)', (done) => {
    setPermissionsOnClass('_User', {
      'create': {'*': true},
      'addField': {}
    }, true).then(() => {
      return Parse.User.signUp('foo', 'bar');
    }).then((user) => {
      expect(user.getUsername()).toBe('foo');
      done()
    }, error => {
      fail(JSON.stringify(error));
      done();
    })
  });

  it('unset field in beforeSave should not stop object creation', (done) => {
    const hook = {
      method: function(req, res) {
        if (req.object.get('undesiredField')) {
          req.object.unset('undesiredField');
        }
        return res.success();
      }
    };
    spyOn(hook, 'method').and.callThrough();
    Parse.Cloud.beforeSave('AnObject', hook.method);
    setPermissionsOnClass('AnObject', {
      get: {"*": true},
      find: {"*": true},
      create: {'*': true},
      update: {'*': true},
      delete: {'*': true},
      addField:{}
    }).then(() => {
      const obj = new Parse.Object('AnObject');
      obj.set('desiredField', 'createMe');
      return obj.save(null, {useMasterKey: true});
    }).then(() => {
      const obj = new Parse.Object('AnObject');
      obj.set('desiredField', 'This value should be kept');
      obj.set('undesiredField', 'This value should be IGNORED');
      return obj.save();
    }).then(() => {
      const query = new Parse.Query('AnObject');
      return query.find();
    }).then((results) => {
      expect(results.length).toBe(2);
      expect(results[0].has('desiredField')).toBe(true);
      expect(results[1].has('desiredField')).toBe(true);
      expect(results[0].has('undesiredField')).toBe(false);
      expect(results[1].has('undesiredField')).toBe(false);
      expect(hook.method).toHaveBeenCalled();
      done();
    });
  });

  it('gives correct response when deleting a schema with CLPs (regression test #1919)', done => {
    new Parse.Object('MyClass').save({ data: 'foo'})
      .then(obj => obj.destroy())
      .then(() => setPermissionsOnClass('MyClass', { find: {}, get: {} }, true))
      .then(() => {
        request.del({
          url: 'http://localhost:8378/1/schemas/MyClass',
          headers: masterKeyHeaders,
          json: true,
        }, (error, response) => {
          expect(response.statusCode).toEqual(200);
          expect(response.body).toEqual({});
          done();
        });
      });
  });

  it("regression test for #1991", done => {
    const user = new Parse.User();
    user.setUsername('user');
    user.setPassword('user');
    const role = new Parse.Role('admin', new Parse.ACL());
    const obj = new Parse.Object('AnObject');
    Parse.Object.saveAll([user, role]).then(() => {
      role.relation('users').add(user);
      return role.save(null, {useMasterKey: true});
    }).then(() => {
      return setPermissionsOnClass('AnObject', {
        'get': {"*": true},
        'find': {"*": true},
        'create': {'*': true},
        'update': {'role:admin': true},
        'delete': {'role:admin': true}
      })
    }).then(() => {
      return obj.save();
    }).then(() => {
      return Parse.User.logIn('user', 'user')
    }).then(() => {
      return obj.destroy();
    }).then(() => {
      const query = new Parse.Query('AnObject');
      return query.find();
    }).then((results) => {
      expect(results.length).toBe(0);
      done();
    }).catch((err) => {
      fail('should not fail');
      jfail(err);
      done();
    });
  });


  it("regression test for #4409 (indexes override the clp)", done => {
    setPermissionsOnClass('_Role', {
      'get': {"*": true},
      'find': {"*": true},
      'create': {'*': true},
    }, true).then(() => {
      const config = Config.get('test');
      return config.database.adapter.updateSchemaWithIndexes();
    }).then(() => {
      return rp.get({
        url: 'http://localhost:8378/1/schemas/_Role',
        headers: masterKeyHeaders,
        json: true,
      });
    }).then((res) => {
      expect(res.classLevelPermissions).toEqual({
        'get': {"*": true},
        'find': {"*": true},
        'create': {'*': true},
        'update': {},
        'delete': {},
        'addField': {},
      });
    }).then(done).catch(done.fail);
  });

  it('regression test for #2246', done => {
    const profile = new Parse.Object('UserProfile');
    const user = new Parse.User();
    function initialize() {
      return user.save({
        username: 'user',
        password: 'password'
      }).then(() => {
        return profile.save({user}).then(() => {
          return user.save({
            userProfile: profile
          }, {useMasterKey: true});
        });
      });
    }

    initialize().then(() => {
      return setPermissionsOnClass('UserProfile', {
        'readUserFields': ['user'],
        'writeUserFields': ['user']
      }, true);
    }).then(() => {
      return Parse.User.logIn('user', 'password')
    }).then(() => {
      const query = new Parse.Query('_User');
      query.include('userProfile');
      return query.get(user.id);
    }).then((user) => {
      expect(user.get('userProfile')).not.toBeUndefined();
      done();
    }, (err) => {
      jfail(err);
      done();
    });
  });

  describe('index management', () => {
    beforeEach(() => require('../lib/TestUtils').destroyAllDataPermanently());
    it('cannot create index if field does not exist', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            indexes: {
              name1: { aString: 1},
            }
          }
        }, (error, response, body) => {
          expect(body.code).toBe(Parse.Error.INVALID_QUERY);
          expect(body.error).toBe('Field aString does not exist, cannot add index.');
          done();
        });
      })
    });

    it_only_db('mongo')('can create index on default field', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            indexes: {
              name1: { createdAt: 1 },
              name2: { updatedAt: 1 },
            }
          }
        }, (error, response, body) => {
          expect(body.indexes.name1).toEqual({ createdAt: 1 });
          expect(body.indexes.name2).toEqual({ updatedAt: 1 });
          config.database.adapter.getIndexes('NewClass').then((indexes) => {
            expect(indexes._id_).toEqual({ _id: 1 });
            expect(indexes.name1).toEqual({ _created_at: 1 });
            expect(indexes.name2).toEqual({ _updated_at: 1 });
            done();
          });
        });
      })
    });

    it_only_db('postgres')('can create index on default field', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            indexes: {
              name1: { createdAt: 1 },
              name2: { updatedAt: 1 },
            }
          }
        }, (error, response, body) => {
          expect(body.indexes.name1).toEqual({ createdAt: 1 });
          expect(body.indexes.name2).toEqual({ updatedAt: 1 });
          config.database.adapter.getIndexes('NewClass').then((indexes) => {
            expect(indexes._id_).toEqual({ _id: 1 });
            expect(indexes.name1).toEqual({ createdAt: 1 });
            expect(indexes.name2).toEqual({ updatedAt: 1 });
            done();
          });
        });
      })
    });

    it('cannot create compound index if field does not exist', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'}
            },
            indexes: {
              name1: { aString: 1, bString: 1},
            }
          }
        }, (error, response, body) => {
          expect(body.code).toBe(Parse.Error.INVALID_QUERY);
          expect(body.error).toBe('Field bString does not exist, cannot add index.');
          done();
        });
      })
    });

    it('allows add index when you create a class', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas',
        headers: masterKeyHeaders,
        json: true,
        body: {
          className: "NewClass",
          fields: {
            aString: {type: 'String'}
          },
          indexes: {
            name1: { aString: 1},
          },
        }
      }, (error, response, body) => {
        expect(body).toEqual({
          className: 'NewClass',
          fields: {
            ACL: {type: 'ACL'},
            createdAt: {type: 'Date'},
            updatedAt: {type: 'Date'},
            objectId: {type: 'String'},
            aString: {type: 'String'}
          },
          classLevelPermissions: defaultClassLevelPermissions,
          indexes: {
            _id_: { _id: 1 },
            name1: { aString: 1},
          },
        });
        config.database.adapter.getIndexes('NewClass').then((indexes) => {
          expect(indexes).toEqual(body.indexes);
          done();
        });
      });
    });

    it('empty index returns default', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas',
        headers: masterKeyHeaders,
        json: true,
        body: {
          className: "NewClass",
          fields: {
            aString: {type: 'String'}
          },
          indexes: {},
        }
      }, (error, response, body) => {
        expect(body).toEqual({
          className: 'NewClass',
          fields: {
            ACL: {type: 'ACL'},
            createdAt: {type: 'Date'},
            updatedAt: {type: 'Date'},
            objectId: {type: 'String'},
            aString: {type: 'String'}
          },
          classLevelPermissions: defaultClassLevelPermissions,
          indexes: defaultIndex,
        });
        done();
      });
    });

    it('lets you add indexes', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'}
            },
            indexes: {
              name1: { aString: 1},
            },
          }
        }, (error, response, body) => {
          expect(dd(body, {
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              aString: {type: 'String'}
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              name1: { aString: 1 },
            }
          })).toEqual(undefined);
          request.get({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
          }, (error, response, body) => {
            expect(body).toEqual({
              className: 'NewClass',
              fields: {
                ACL: {type: 'ACL'},
                createdAt: {type: 'Date'},
                updatedAt: {type: 'Date'},
                objectId: {type: 'String'},
                aString: {type: 'String'}
              },
              classLevelPermissions: defaultClassLevelPermissions,
              indexes: {
                _id_: { _id: 1 },
                name1: { aString: 1 },
              }
            });
            config.database.adapter.getIndexes('NewClass').then((indexes) => {
              expect(indexes).toEqual(body.indexes);
              done();
            });
          });
        });
      })
    });

    it_only_db('mongo')('lets you add pointer index', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aPointer: { type: 'Pointer', targetClass: 'NewClass' }
            },
            indexes: {
              aPointer_1: { aPointer: 1 },
            },
          }
        }, (error, response, body) => {
          expect(dd(body, {
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              aPointer: { type: 'Pointer', targetClass: 'NewClass' }
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              aPointer_1: { aPointer: 1},
            }
          })).toEqual(undefined);
          request.get({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
          }, (error, response, body) => {
            expect(body).toEqual({
              className: 'NewClass',
              fields: {
                ACL: {type: 'ACL'},
                createdAt: {type: 'Date'},
                updatedAt: {type: 'Date'},
                objectId: {type: 'String'},
                aPointer: { type: 'Pointer', targetClass: 'NewClass' }
              },
              classLevelPermissions: defaultClassLevelPermissions,
              indexes: {
                _id_: { _id: 1 },
                aPointer_1: { aPointer: 1 },
              }
            });
            config.database.adapter.getIndexes('NewClass').then((indexes) => {
              expect(indexes._id_).toEqual({ _id: 1 });
              expect(indexes.aPointer_1).toEqual({ _p_aPointer: 1 });
              done();
            });
          });
        });
      })
    });

    it_only_db('postgres')('lets you add pointer index', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aPointer: { type: 'Pointer', targetClass: 'NewClass' }
            },
            indexes: {
              aPointer_1: { aPointer: 1 },
            },
          }
        }, (error, response, body) => {
          expect(dd(body, {
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              aPointer: { type: 'Pointer', targetClass: 'NewClass' }
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              aPointer_1: { aPointer: 1},
            }
          })).toEqual(undefined);
          request.get({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
          }, (error, response, body) => {
            expect(body).toEqual({
              className: 'NewClass',
              fields: {
                ACL: {type: 'ACL'},
                createdAt: {type: 'Date'},
                updatedAt: {type: 'Date'},
                objectId: {type: 'String'},
                aPointer: { type: 'Pointer', targetClass: 'NewClass' }
              },
              classLevelPermissions: defaultClassLevelPermissions,
              indexes: {
                _id_: { _id: 1 },
                aPointer_1: { aPointer: 1 },
              }
            });
            config.database.adapter.getIndexes('NewClass').then((indexes) => {
              expect(indexes._id_).toEqual({ _id: 1 });
              expect(indexes.aPointer_1).toEqual({ aPointer: 1 });
              done();
            });
          });
        });
      })
    });

    it('lets you add multiple indexes', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'},
              bString: {type: 'String'},
              cString: {type: 'String'},
              dString: {type: 'String'},
            },
            indexes: {
              name1: { aString: 1 },
              name2: { bString: 1 },
              name3: { cString: 1, dString: 1 },
            }
          }
        }, (error, response, body) => {
          expect(dd(body, {
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              aString: {type: 'String'},
              bString: {type: 'String'},
              cString: {type: 'String'},
              dString: {type: 'String'},
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              name1: { aString: 1 },
              name2: { bString: 1 },
              name3: { cString: 1, dString: 1 },
            }
          })).toEqual(undefined);
          request.get({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
          }, (error, response, body) => {
            expect(body).toEqual({
              className: 'NewClass',
              fields: {
                ACL: {type: 'ACL'},
                createdAt: {type: 'Date'},
                updatedAt: {type: 'Date'},
                objectId: {type: 'String'},
                aString: {type: 'String'},
                bString: {type: 'String'},
                cString: {type: 'String'},
                dString: {type: 'String'},
              },
              classLevelPermissions: defaultClassLevelPermissions,
              indexes: {
                _id_: { _id: 1 },
                name1: { aString: 1 },
                name2: { bString: 1 },
                name3: { cString: 1, dString: 1 },
              },
            });
            config.database.adapter.getIndexes('NewClass').then((indexes) => {
              expect(indexes).toEqual(body.indexes);
              done();
            });
          });
        });
      })
    });

    it('lets you delete indexes', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'},
            },
            indexes: {
              name1: { aString: 1 },
            }
          }
        }, (error, response, body) => {
          expect(dd(body, {
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              aString: {type: 'String'},
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              name1: { aString: 1 },
            }
          })).toEqual(undefined);
          request.put({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
            body: {
              indexes: {
                name1: { __op: 'Delete' }
              }
            }
          }, (error, response, body) => {
            expect(body).toEqual({
              className: 'NewClass',
              fields: {
                ACL: {type: 'ACL'},
                createdAt: {type: 'Date'},
                updatedAt: {type: 'Date'},
                objectId: {type: 'String'},
                aString: {type: 'String'},
              },
              classLevelPermissions: defaultClassLevelPermissions,
              indexes: {
                _id_: { _id: 1 },
              }
            });
            config.database.adapter.getIndexes('NewClass').then((indexes) => {
              expect(indexes).toEqual(body.indexes);
              done();
            });
          });
        });
      })
    });

    it('lets you delete multiple indexes', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'},
              bString: {type: 'String'},
              cString: {type: 'String'},
            },
            indexes: {
              name1: { aString: 1 },
              name2: { bString: 1 },
              name3: { cString: 1 },
            }
          }
        }, (error, response, body) => {
          expect(dd(body, {
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              aString: {type: 'String'},
              bString: {type: 'String'},
              cString: {type: 'String'},
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              name1: { aString: 1 },
              name2: { bString: 1 },
              name3: { cString: 1 },
            }
          })).toEqual(undefined);
          request.put({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
            body: {
              indexes: {
                name1: { __op: 'Delete' },
                name2: { __op: 'Delete' },
              }
            }
          }, (error, response, body) => {
            expect(body).toEqual({
              className: 'NewClass',
              fields: {
                ACL: {type: 'ACL'},
                createdAt: {type: 'Date'},
                updatedAt: {type: 'Date'},
                objectId: {type: 'String'},
                aString: {type: 'String'},
                bString: {type: 'String'},
                cString: {type: 'String'},
              },
              classLevelPermissions: defaultClassLevelPermissions,
              indexes: {
                _id_: { _id: 1 },
                name3: { cString: 1 },
              }
            });
            config.database.adapter.getIndexes('NewClass').then((indexes) => {
              expect(indexes).toEqual(body.indexes);
              done();
            });
          });
        });
      })
    });

    it('lets you add and delete indexes', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'},
              bString: {type: 'String'},
              cString: {type: 'String'},
              dString: {type: 'String'},
            },
            indexes: {
              name1: { aString: 1 },
              name2: { bString: 1 },
              name3: { cString: 1 },
            }
          }
        }, (error, response, body) => {
          expect(dd(body, {
            className: 'NewClass',
            fields: {
              ACL: {type: 'ACL'},
              createdAt: {type: 'Date'},
              updatedAt: {type: 'Date'},
              objectId: {type: 'String'},
              aString: {type: 'String'},
              bString: {type: 'String'},
              cString: {type: 'String'},
              dString: {type: 'String'},
            },
            classLevelPermissions: defaultClassLevelPermissions,
            indexes: {
              _id_: { _id: 1 },
              name1: { aString: 1 },
              name2: { bString: 1 },
              name3: { cString: 1 },
            }
          })).toEqual(undefined);
          request.put({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
            body: {
              indexes: {
                name1: { __op: 'Delete' },
                name2: { __op: 'Delete' },
                name4: { dString: 1 },
              }
            }
          }, (error, response, body) => {
            expect(body).toEqual({
              className: 'NewClass',
              fields: {
                ACL: {type: 'ACL'},
                createdAt: {type: 'Date'},
                updatedAt: {type: 'Date'},
                objectId: {type: 'String'},
                aString: {type: 'String'},
                bString: {type: 'String'},
                cString: {type: 'String'},
                dString: {type: 'String'},
              },
              classLevelPermissions: defaultClassLevelPermissions,
              indexes: {
                _id_: { _id: 1 },
                name3: { cString: 1 },
                name4: { dString: 1 },
              }
            });
            config.database.adapter.getIndexes('NewClass').then((indexes) => {
              expect(indexes).toEqual(body.indexes);
              done();
            });
          });
        });
      })
    });

    it('cannot delete index that does not exist', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            indexes: {
              unknownIndex: { __op: 'Delete' }
            }
          }
        }, (error, response, body) => {
          expect(body.code).toBe(Parse.Error.INVALID_QUERY);
          expect(body.error).toBe('Index unknownIndex does not exist, cannot delete.');
          done();
        });
      })
    });

    it('cannot update index that exist', done => {
      request.post({
        url: 'http://localhost:8378/1/schemas/NewClass',
        headers: masterKeyHeaders,
        json: true,
        body: {},
      }, () => {
        request.put({
          url: 'http://localhost:8378/1/schemas/NewClass',
          headers: masterKeyHeaders,
          json: true,
          body: {
            fields: {
              aString: {type: 'String'},
            },
            indexes: {
              name1: { aString: 1 }
            }
          }
        }, () => {
          request.put({
            url: 'http://localhost:8378/1/schemas/NewClass',
            headers: masterKeyHeaders,
            json: true,
            body: {
              indexes: {
                name1: { field2: 1 }
              }
            }
          }, (error, response, body) => {
            expect(body.code).toBe(Parse.Error.INVALID_QUERY);
            expect(body.error).toBe('Index name1 exists, cannot update.');
            done();
          });
        });
      })
    });

    it('get indexes on startup', (done) => {
      const obj = new Parse.Object('TestObject');
      obj.save().then(() => {
        return reconfigureServer({
          appId: 'test',
          restAPIKey: 'test',
          publicServerURL: 'http://localhost:8378/1',
        });
      }).then(() => {
        request.get({
          url: 'http://localhost:8378/1/schemas/TestObject',
          headers: masterKeyHeaders,
          json: true,
        }, (error, response, body) => {
          expect(body.indexes._id_).toBeDefined();
          done();
        });
      });
    });

    it('get compound indexes on startup', (done) => {
      const obj = new Parse.Object('TestObject');
      obj.set('subject', 'subject');
      obj.set('comment', 'comment');
      obj.save().then(() => {
        return config.database.adapter.createIndex('TestObject', {subject: 'text', comment: 'text'});
      }).then(() => {
        return reconfigureServer({
          appId: 'test',
          restAPIKey: 'test',
          publicServerURL: 'http://localhost:8378/1',
        });
      }).then(() => {
        request.get({
          url: 'http://localhost:8378/1/schemas/TestObject',
          headers: masterKeyHeaders,
          json: true,
        }, (error, response, body) => {
          expect(body.indexes._id_).toBeDefined();
          expect(body.indexes._id_._id).toEqual(1);
          expect(body.indexes.subject_text_comment_text).toBeDefined();
          expect(body.indexes.subject_text_comment_text.subject).toEqual('text');
          expect(body.indexes.subject_text_comment_text.comment).toEqual('text');
          done();
        });
      });
    });

    it_exclude_dbs(['postgres'])('cannot update to duplicate value on unique index', (done) => {
      const index = {
        code: 1
      };
      const obj1 = new Parse.Object('UniqueIndexClass');
      obj1.set('code', 1);
      const obj2 = new Parse.Object('UniqueIndexClass');
      obj2.set('code', 2);
      const adapter = config.database.adapter;
      adapter._adaptiveCollection('UniqueIndexClass').then(collection => {
        return collection._ensureSparseUniqueIndexInBackground(index);
      }).then(() => {
        return obj1.save();
      }).then(() => {
        return obj2.save();
      }).then(() => {
        obj1.set('code', 2);
        return obj1.save();
      }).then(done.fail).catch((error) => {
        expect(error.code).toEqual(Parse.Error.DUPLICATE_VALUE);
        done();
      });
    });

    it('invalid string index', (done) => {
      const obj = new Parse.Object('TestObject');
      obj.set('name', 'parse');
      obj.save().then(() => {
        const index = {
          name: 'invalid'
        };
        const schema = new Parse.Schema('TestObject');
        schema.addIndex('string_index', index);
        return schema.update();
      }).then(done.fail).catch((error) => {
        expect(error.code).toEqual(Parse.Error.INVALID_QUERY);
        done();
      });
    });

    it('invalid geopoint index', (done) => {
      const obj = new Parse.Object('TestObject');
      const geoPoint = new Parse.GeoPoint(22, 11);
      obj.set('location', geoPoint);
      obj.save().then(() => {
        const index = {
          location: 'invalid'
        };
        const schema = new Parse.Schema('TestObject');
        schema.addIndex('geo_index', index);
        return schema.update();
      }).then(done.fail).catch((error) => {
        expect(error.code).toEqual(Parse.Error.INVALID_QUERY);
        done();
      });
    });

    it('invalid polygon index', (done) => {
      const points = [[0,0],[0,1],[1,1],[1,0]];
      const polygon = new Parse.Polygon(points);
      const obj = new Parse.Object('TestObject');
      obj.set('bounds', polygon);
      obj.save().then(() => {
        const index = {
          bounds: 'invalid'
        };
        const schema = new Parse.Schema('TestObject');
        schema.addIndex('poly_index', index);
        return schema.update();
      }).then(done.fail).catch((error) => {
        expect(error.code).toEqual(Parse.Error.INVALID_QUERY);
        done();
      });
    });

    it('valid polygon index', (done) => {
      const points = [[0,0],[0,1],[1,1],[1,0]];
      const polygon = new Parse.Polygon(points);
      const obj = new Parse.Object('TestObject');
      obj.set('bounds', polygon);
      obj.save().then(() => {
        const index = {
          bounds: '2dsphere'
        };
        const schema = new Parse.Schema('TestObject');
        schema.addIndex('valid_index', index);
        return schema.update();
      }).then(done).catch(done.fail);
    });
  });
});
