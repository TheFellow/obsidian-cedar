# Policy

```cedar
// Alice can view photos in her vacation album, unless they're private.
@id("vacation-photos")
permit (
  principal == PhotoApp::User::"alice",
  action in [PhotoApp::Action::"viewPhoto", PhotoApp::Action::"listPhotos"],
  resource in PhotoApp::Album::"alice_vacation"
)
when { resource.owner == principal && context.mfa == true && context.n > 10 }
unless { resource.private || ip("10.0.0.1").isLoopback() || "bad \q escape" like "*x" };

// a template, with slots
forbid (principal == ?principal, action, resource in ?resource)
when { decimal("1.5").lessThan(decimal("2.0")) };
```

# Schema

```cedarschema
@doc("this is the namespace")
namespace TinyTodo {
    type Task = {
        "id": Long,
        "name": String,
        "state"?: String,
    };
    type Tasks = Set<Task>;

    entity Application, User, Team;
    entity List in [Application] = {
        "editors": Team,
        "owner": User,
        "tasks": Tasks,
    };

    action DeleteList, GetList, UpdateList appliesTo {
        principal: [User],
        resource: [List],
        context: { "ip": ipaddr }
    };
}
```

# Inside a blockquote

> ```cedar
> permit (principal, action, resource) when { context.ok };
> ```

> ```cedarschema
> namespace TinyTodo { type Task; }
> ```

# Unaffected

```js
const notCedar = "should still highlight as JavaScript";
```
