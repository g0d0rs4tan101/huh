# Syntax
**Variables**
```
huh==(name)==("Alice")           # string
==(age)==(25)                 # number
==(pi)==(3.14159)             # float
==(fruits)==("apple", "banana", 42)  # list (commas required)
```
# Math $ ... $
```
huh==(result)==($ 5 + 3 * (10 - 2) $)  # → 84
==(double)==($ result * 2 $)        # variables work inside math
```
Operators: + - * / % ( )
# Print
```huh<<>>("Hello")     # string
<<>>(age)         # variable
<<>>($ 2 + 2 $)   # math
If / Else
huh^^ name=("Alice"):     # colon REQUIRED
   <<>>("Welcome!")
%%:                    # else (optional)
   <<>>("Who dis?")
Compares: strings, numbers, lists, math results
Loops (3 types)
huh# 1. Repeat N times
==>>=(5):
   <<>>("beep ")
==<<

# 2. Foreach
==>>=(item,fruits):
   <<>>(item)
==<<

# 3. While (with operators)
==(i)==(0)
==>>=(i < 10):
   <<>>(i)
   ==(i)==($ i + 1 $)
==<<
```
While operators: < > <= >= = !=
HTTP GET
huh&& -g "https://api.github.com/users/octocat"
Discord Webhooks
huh&& -p "https://discord.com/api/webhooks/..." ("Hello world!")

&& -p "https://discord.com/api/webhooks/..." ("Title", "Message body")

&& -p "https://discord.com/api/webhooks/..." (name)  # sends variable
# Full Example
```
huh==(name)==("Huh? Lang")
==(score)==(100)
==(items)==("sword", "shield", "potion")

<<>>("Player: ")
<<>>(name)
<<>>("Score: ")
<<>>(score)

==>>=(item,items):
   <<>>("Got: ")
   <<>>(item)
==<<

^^ score=($ 100 $):
   <<>>("Perfect score!")
%%:
   <<>>("Keep grinding")

&& -p "YOUR_WEBHOOK" ("Game over!", "Score: " + score)
```
⚠️ Gotchas
Strings MUST have quotes: "hello"
Lists NEED commas: ("a", "b")
Loops END with ==<<
If NEEDS colon :
Math ONLY uses numbers (no strings inside $...$)

# Examples
```
Countdown Timer
huh==(i)==(10)
==>>=(i > 0):
   <<>>("T-")
   <<>>(i)
   ==(i)==($ i - 1 $)
==<<
<<>>("BLASTOFF!")
Discord Bot
huh&& -g "https://api.example.com/status"
&& -p "WEBHOOK" ("Server is up!")
```
# Roadmap
 Functions
 File I/O
 More math operators
 Arrays as first-class objects
 GUI (maybe?)
