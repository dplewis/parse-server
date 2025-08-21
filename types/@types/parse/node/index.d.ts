import { File, Object, Query, Session, User } from 'parse';

// All exports beyond this point will be included in the Parse namespace
export as namespace Parse;
import * as Cloud from '../../../cloud-code/Parse.Cloud';

declare const Parse: {
  Cloud: typeof Cloud;
  File: typeof File;
  Object: typeof Object;
  Query: typeof Query;
  Session: typeof Session;
  User: typeof User;
};
export { 
  Cloud,
  File,
  Object,
  Query,
  Session,
  User,
};
export default Parse;
