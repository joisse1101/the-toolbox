# UC-sign-in - Sign in

> **Use-case specification** with its class diagram and sequence diagrams. Drawn from the shaped
> stories below; it is analysis level (no repo was read).

| Field | Value |
|-------|-------|
| **Slice** | sign-in |
| **Scope** | Feature: Identity and access > Sign in |
| **Primary actor** | Member |
| **Maturity** | planned |

**Stories**

<!-- stories:start -->
- IAM-0001 Sign in with email
- IAM-0002 Reset a password
<!-- stories:end -->

## Description
A member signs in with an email and password and reaches their dashboard, or asks for a password reset
and is sent a reset link.

## Preconditions
- The member is registered and has a password.

## Main flow
1. The member enters an email and password on the sign-in form.
2. `AuthService` looks the member up by email through `MemberRepository` and verifies the password.
3. The member sees their dashboard.

Reset: the member asks for a reset with their email, `PasswordResetService` issues a `ResetLink` and
`Mailer` sends it.

## Alternative and exception flows
- **Unknown email or wrong password** (to be confirmed with the product owner, no story states it) ->
  the sign-in is refused and no dashboard is shown.
- **Reset for an unknown email** (to be confirmed) -> no link is sent.

## Postconditions
- After sign-in, the member is authenticated and sees their dashboard.
- After a reset request, a reset link has been sent to the member.

## Acceptance criteria

| AC id | Story | Path | Flow | Given / when / then |
|---|---|---|---|---|
| **AC-sign-in-dashboard** | Sign in with email | main | login | Given a registered member, when they sign in with the right password, then they see their dashboard. |
| **AC-sign-in-reset-link** | Reset a password | main | reset | Given a registered member, when they ask for a reset, then they are sent a reset link. |

## Implementation overview
TBC

## Traceability
TBC

## Class diagram

```mermaid
classDiagram
  namespace IdentityAndAccess {
    class SignInForm {
      <<boundary>>
      +submit(email, password)
    }
    class ResetRequestForm {
      <<boundary>>
      +submit(email)
    }
    class AuthService {
      <<service>>
      +authenticate(email, password) Member
    }
    class PasswordResetService {
      <<service>>
      +requestReset(email)
    }
    class Member {
      <<root entity>>
      -email : Email
      -credential : Credential
      +verifyCredential(raw) bool
    }
    class Email {
      <<value object>>
    }
    class Credential {
      <<value object>>
    }
    class ResetLink {
      <<value object>>
    }
    class MemberRepository {
      <<repository>>
      +getByEmail(email) Member
    }
    class Mailer {
      <<port>>
      +send(email, link)
    }
  }
  SignInForm ..> AuthService : authenticate
  ResetRequestForm ..> PasswordResetService : requestReset
  AuthService --> MemberRepository : getByEmail
  PasswordResetService --> MemberRepository : getByEmail
  AuthService ..> Member : verifyCredential
  PasswordResetService ..> ResetLink : issue
  PasswordResetService --> Mailer : send
  Member ..> Email
  Member ..> Credential
```

## Sequence diagrams

### Sequence: login

```mermaid
sequenceDiagram
  actor U as Member
  participant FORM as «boundary»<br/>SignInForm
  participant AUTH as «service»<br/>AuthService
  participant REPO as «repository»<br/>MemberRepository
  participant MEMBER as «root entity»<br/>Member
  participant DASH as «boundary»<br/>Dashboard

  rect rgb(235, 242, 250)
    Note over U,DASH: Phase 1 - Authenticate
    U->>FORM: 1.1 enter email + password, submit
    FORM->>AUTH: 1.2 authenticate(email, password)
    AUTH->>REPO: 1.3 getByEmail(email)
    alt member found
      REPO-->>AUTH: Member
      AUTH->>MEMBER: 1.4 verifyCredential(password)
      alt password matches
        MEMBER-->>AUTH: true
      else password wrong
        MEMBER-->>AUTH: false
        AUTH-->>FORM: sign-in refused
      end
    else no such member
      REPO-->>AUTH: none
      AUTH-->>FORM: sign-in refused
    end
  end

  rect rgb(235, 242, 250)
    Note over U,DASH: Phase 2 - Reach the account
    AUTH-->>FORM: Member
    FORM->>DASH: 2.1 show dashboard
    DASH-->>U: 2.2 dashboard shown
  end
```

### Sequence: reset

```mermaid
sequenceDiagram
  actor U as Member
  participant FORM as «boundary»<br/>ResetRequestForm
  participant RESET as «service»<br/>PasswordResetService
  participant REPO as «repository»<br/>MemberRepository
  participant RLINK as «value object»<br/>ResetLink
  participant MAILER as «port»<br/>Mailer

  rect rgb(235, 242, 250)
    Note over U,MAILER: Phase 1 - Ask for a reset
    U->>FORM: 1.1 enter email, ask for a reset
    FORM->>RESET: 1.2 requestReset(email)
    RESET->>REPO: 1.3 getByEmail(email)
    alt member found
      REPO-->>RESET: Member
      RESET->>RLINK: 1.4 issue()
      RLINK-->>RESET: ResetLink
    else no such member
      REPO-->>RESET: none
    end
  end

  rect rgb(235, 242, 250)
    Note over U,MAILER: Phase 2 - Send the link
    RESET->>MAILER: 2.1 send(email, link)
    MAILER-->>U: 2.2 reset link received
  end
```
