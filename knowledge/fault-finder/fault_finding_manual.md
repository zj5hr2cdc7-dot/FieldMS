# FieldMS Fault-Finding Manual (OCR Transcript)

Transcribed from photographed manual pages. OCR may contain minor errors; refer to source photos (manual_pages/page_<id>.jpg) for verification.



---

## Photo IMG_1610

Fault Finder’s Bible: Electrical Edition
© 2025 Fault Lab
All rights reserved.

No part of this publication may be reproduced, distributed, or
transmitted in any form or by any means, including
photocopying, recording, or other electronic or mechanical
methods, without the prior written permission of the publisher,
except in the case of brief quotations used in reviews or
educational purposes.

Published by Fault Lab
ABN 45 691 833 593
ISBN: 978-1-7641674-0-6
Second Edition

Printed in Australia

Disclaimer:
This book is not a replacement for formal electrical training or

licensing. It is designed as a supplemental resource for qualified
professionals and apprentices. Always follow your local electrical
codes, safety regulations, and manufacturer instructions. The
author and publisher are not liable for any damages resulting

from the application of this material.

---

## Photo IMG_1611

Oa

Definition of Live Testing

Live testing is the process of carrying out electrical
measurements or diagnostics on a circuit or piece of equipment
while it remains energised and voltage is present. Unlike de-
energised testing, which is performed with the supply safely
isolated, live testing involves working on equipment where
electrical potential exists.

It is typically used to:

¢ Confirm the presence of voltage at a specific point.

e Measure current draw under real operating conditions.

e Identify voltage drops, phase loss, or imbalances.

¢ Test protective devices such as RCDs and circuit breakers.

Disclaimer

Warning and limitation of liability

This book is a guide and is intended for educational purposes

only. It is not intended to provide comprehensive instruction,
prescriptive procedures, or professional advice for any specific
situation. The information contained within has been

compiled to the best of the author's ability based on New
Zealand and Australian electrical standards and regulations at
the time of publication. However, it is not a replacement for
official regulatory documents, codes of practice, or mandatory
standards such as the Australia/New Zealand Wiring Rules
(AS/NZS 3000).

All electrical work must be performed by a competent, licensed
electrical worker with a current practising licence.

   

 
       
     
       
      
   
   
   
   
   
   
   
   
   
   
   
 
 
 
  

 

Changes in regula
The electrical indus
and technology, Is”
accept no liability f
the information cot
amendments, tect
industry best prac

Personal respon
As a licensed ele
you do. You mus
judgement to det
You should not <
knowledge, skill:
Undertaking wo!
can lead to uns

No replacemet!
This guide doe:
supervision, or
regarding any
worker should
experienced p

Third-party c
Any external |
this guide are
not endorse ¢
reliability of ¢

Failure to fc
serious injt
conditions,
procedures

---

## Photo IMG_1612

trical

¥ece Of equipment

ent. Unlike de-
‘ Supply safely
yment where

fic point.

j conditions.
lances.

circuit breakers.

ional purposes
fe instruction,
for any specific
been

d on New

{ regulations at
acement for
_or mandatory
Jiring Rules

yetent, licensed

POM 000

 

 
   
 
  
  
  
 
 
  
  
  
 
    
  
   
  
  
  
 
 
 
 
 
  
  
 
 
  
  
 

technology

Changes in regulations and
g safety regulatio

The electrical industry, includin
and technology, is subject to change- The autho
accept no liability for any loss OF damage arising from the
the information contained in this guide due to regulatory
amendments, technological advancements, Of changes In

industry best practices.

Personal responsibility
As a licensed electrical worker, you are responsible for the
you do. You must use your own professional expertise and
judgement to determine the appropriate approach for any task. —
You should not attempt any work unless you have the necessary
knowledge, skills, and experience to do it competently.

Undertaking work outside your areas of competence is risky and

can lead to unsafe situations.

No replacement for consultation or training

This guide does not replace the need for hands-on training,
supervision, OF consultation with other experts. In case of doubt
regarding any procedure or regulation, a licensed electrical
worker should stop work and seek further advice from a more

experienced professional.

  
 
  
 
  
  
   
 
    

Third-party content
Any external links, references, or third-party content included in

this guide are for convenience only. The publisher and author do
not endorse or take responsibility for the content, accuracy, OF
reliability of any linked websites or external SOUICeS.

Failure to follow proper live testing procedures may result in
s injury or legal consequences. Always verify circuit
use appropriate lockout/tagout (LOTO)
and follow site-specific safety policies.

T

seriou
conditions,
procedures,

---

## Photo IMG_1613

N TO FAULT
NG

The Basics

  
    

The Basics of Electrical Fault Finding
Electrical fault finding is the process of diagnosing a
issues within an electrical system. Whether working ©
commercial, or industrial systems, understanding the
fundamentals of electricity and common faults will make
troubleshooting more efficient and effective.

d resolving
n domestic,

     
    
   
   
   
    
  
 
 
 

Understanding How Electricity Works
Electricity flows through a closed-loop system known as a circuit.
A circuit consists of:

A power source (such as a battery or mains supply)

Conductors (cables that carry current)

Loads (devices that consume electricity, like lights or appliances)
Switches, isolators and protective devices (such as circuit
breakers and fuses)

 
   
   
   
 

Electricity follows Ohm's Law, which states that Voltage (V) =
Current (I) x Resistance (R). This relationship helps in
diagnosing faults by measuring changes in voltage, current, or
resistance. A simple way to remember this is by referring to the
illustration below.

---

## Photo IMG_1614

Common Electrical Faults and What to Look Out

For : : oe
Several electrical faults can occur in any system, including:

¢ Open Circuits — A break in the circuit prevents current from
flowing (e.g., a broken wire or faulty switch).
e Signs: No power to the load, no continuity when tested.

¢ Short Circuits — A low-resistance path causes excessive
current flow, often leading to tripped breakers.

0 Signs: Tripped circuit breakers, blown fuses,
overheating.

¢ Earth Faults — Current leaks to earth instead of follo

wing the
intended circuit.

e Signs: RCD (Residual Current Device) tripping, electric
shocks, equipment malfunctions.

¢ Overloads — Too many devices drawin
Causing protective devices to activate.
© Signs: Circuit breakers tripping intermittently.

9 current on a circuit,

* Voltage Drops — Excessive resi

stance in wiring leads to
reduced voltage at the load.

0 Signs: Dimming lights, underperforming motors.

12

 

 

ny

—

mi
—
st)

AC vs. D

Understandi

and Direct C
systems:

- AC (Alte

0 Cha

o Use

o Eas

e DC (Dire

o Flov

o FOU

o Pro’

Basics
Transforme
AC electric
electromag
¢ Primar
¢ Secon:
Output.

¢ Core -
transfe
Types of T
¢ Step-u
lines).

* Step-d
Dower

° lsolati
Safety

---

## Photo IMG_1615

Vhat to L ook Out

ile
eee a. — oe
= be
a -
—

ome
eS Oper es x

— — "east = Z Ti,

—

=e, 3
ih.
_
; fe ®

  
    
  
     
   
  
   
   
 
 
  
 
 

 

ac vs. me ee

me Q ihe difference he

 

4 i Pate
not Direct Current | ee
ms LATS A Ante a (DC) Not Uti: fF

= -
Ls Sy Ss s SS.
Ci

 

ecincity for sea
> Easter to transmit over long ae NCES WAN h transformers
« DC (Direct Current)
+ Hows in one direction consistently.
= = Found in batteries, solar power, and electronic circuits.
: Prowides stable voltage, ideal for sensitive equipment.

== «Basics of How Transformers Work
Seag 'atSformers are essential for stepping voltage up or down in
; AC electncal systems. They work on the principle of
—S electromagnetic induction and consist of-
= - Primary winding — Connected to the input voltage.
Secondary winding — Provides the transformed voltage
output.
- Core — Concentrates the magnetic field for efficient energy
transfer.
Types of Transformers:
+ Step-up Transformer: Increases voltage (e.g., transmission
lines).
Step-down Transformer: Decreases voltage (e.g., household

power supply).
- fsolation Transformer: Provides electrical separation for

Safety.

---

## Photo IMG_1616

The Dangers of Electricity

azardous when not

      
 

Electricity is extremely useful, but also h 1
handled properly. Some of the main dangers include:
1.Electric Shock — When electrical current passes through the
body, it can cause burns, muscle contractions, and even stop

     
 
      
   

the heart.
2. Electrocution — A fatal electric shock.
3 Electrical Burns — High voltage can Cause severe internal
and external burns.
4 Arc Flash & Arc Blast — A sudden electrical explosion that
can reach thousands of degrees, causing severe injuries.
5. Fires — Faulty wiring, overloaded circuits, and short circuits
can ignite fires.
6. Explosions — Sparks in flammable environments (€.g., mines,
fuel stations) can lead to explosions.
[These dangers are well-documented in safety guidelines such
as Safe Work Australia's Managing Electrical Risks in the
Workplace and AS/NZS 3000:2018]

        
    
      
 
   
    
      
     
    
    
     
   

What Happens When an Electric Shock Occurs?
The effects of electric shock depend on current (amperes),
voltage, duration, and pathway through the body. Possible
effects include:
¢ 0.5 - 1mA: Slight tingling sensation.
e 1-5mA: Mild shock, can be painful but not dangerous.
¢ 9- 10mA: Stronger shock, possible muscle contractions.
’ oh - 20mA: Loss of muscle control, difficulty letting go of live
wires.
« 20 - 50mA: Pain, severe muscle contractions, difficulty
breathing.

* 90 - 100MA: Ventricular fibrillation (irregular heart rhythm),
can be fatal if untreated.

    
      
      
 
  
 
 
   
 

     
      
  

100 - 200MA: Severe Dt
. 200MA+: H
death. [Sou
Bein

eart can go}
roe: IEC 60:

gs and Livestock]

Lethal Current:
- Asilittle as 30mA (0.03

second can cause Cart
- 100mA (0.1A) is often
rhythm.
» High-voltage shocks (j
burns and nerve dams

Why Does Current Kill, |
- Voltage (V) pushes th

current that causes h

- High voltage increases

sufficient current, ele

[Source: IEC 60479-1, E
Livestock]
Safe Working Practice:

Always isolate powe
Wear proper PPE (it
protection if requirec
Use insulated tools
conductors.
Never work on live
only where permitte
State or territory. In
relevant procedure
required.
- Follow current elec
Work is occurring

---

## Photo IMG_1618

ricity

4S when not
lude:

SES through the
Ss, and even stop

‘ere intemal
picsion that
re injunies.
hort Circuits

Ss (E.g., mines.

ines such
n the

COCCI tens

_
bi

DADO DD DDN

    
    
 
 
 

« 100 - 200MA: Severe bums, heart Stops beating effective
- 200mA+: Heart can go into sustained contraction, leadin
death. [Source: |EC 60479-1, Effects of Current on Huma
Beings and Livestock] 7

Lethal Current:
- As little as 30mA (0.03A) Passing through the chest for 1
second Can cause cardiac arrest.
* 100mA (0.1A) is often fatal, Especially if it disrupts the heart
rhythm.
- High-voltage shocks (above 600V) can cause deep intemal
bums and nerve damage, even if the current is momentary.

Why Does Current Kill, Not Just Voltage?
¢ Voltage (V) pushes the current (A) through the body, but it is
Current that causes harm.
- High voltage increases the risk of current flowing, but without
Sufficient current, electrocution may not occur.
[Source: [EC 60479-1, Effects of Current on Human Beings and
Livestock]
Safe Working Practices

- Always isolate power before working on circuits.

- Wear proper PPE (insulated gloves, safety boots. arc flash

protection if required).

- Use insulated tools and test for voltage before touching

conductors.

- Never work on live circuits unless absolutely necessary, and
only where permitted under the electrical safety laws of your
State or terntory. In such cases, strict compliance with the
relevant procedures mandated by local regulations is
required.

Follow current electrical safety regulations in country/state of

work is occurmng

---

## Photo IMG_1619

Safety and PPE

Electrical work comes with various risks, from electric shocks
and burns to falling objects and hazardous environments. Proper
Personal Protective Equipment (PPE) and safety protocols help
minimise these risks. Also check with current state requirements
for the correct PPE when working with electrical equipment.

1. Personal Protective Equipment (PPE) and Why It’s
Needed

Foot Protection — Steel-Capped Boots
e Why?

e Protects feet from heavy objects (tools, materials,
panels) falling.

e Reduces risk of injury from stepping on sharp objects like
nails or screws.

e Provides insulation against electric shock if rated EH
(Electrical Hazard).

Hand Protection — Insulated Gloves & General Work Gloves
e Why?

e Insulated gloves (rated for voltage) prevent electric
shocks when working on live circuits.

e Leather or rubber gloves protect hands from cuts.
abrasions, and burns.

e Use Class 0 gloves (up to 1,000V) or Class 1 gloves (up
to 7,500V) for electrical work.

 

Eye & Face Protection — Safety Glasses / Face Shield
« Why?

e Protects eyes from sparks, arc flash, or flying debris
when cutting conduit or drilling.

 

16

>» Reduces risk of
industrial envire
> Arc-rated face
high-voltage P<

: Respiratory Protection

a - Why?
5 le o Prevents inha
— fumes when d
= spaces.
“tad o Respirators a
= areas with as
ae
Hearing Protection —
5 on » Why?
—— e Protects hea
a generators, |
. eo Reduces the
— noise workp
—=
Fire-Resistant (FR)
— - Why?

oan e Prevents b
e Cotton or f
of polyeste

© For industi

Thermal P

Head Protection -

i
re
&—
re
a 4 * Why?
Le |
—
=
—=

 

o Protects ;
exposed
e Reduces
with over

---

## Photo IMG_1620

tor chemicals

   

2PE o Reduces risk of dus
industrial environments:

from electric shocks oe > Arc-rated face shields are requyt

4S Environments. Proper high-voltage panels.

d safety protocols help

ent state requirements Respiratory Protection — Dust Mask / Respirator

 

     
     
  
  
  
  
  
   
   
  
  
   
  
  
 

 

 

-ctrical equipment. mn ¢ Why?
a > Prevents inhalation of dust, fibreglass part
) and Why It’s ™_ fumes when drilling, grinding, or working In a)
= spaces. |
+ © Respirators are necessary per state requireme ie
” areas with asbestos or fine particles. :
yy
ols, materials, Hearing Protection — Earplugs / Earmuffs
|
r e Why?
on sharp objects like oo © Protects hearing in loud environments (e.g., working near

 

generators, drilling into concrete).
o Reduces the risk of long-term hearing damage in high-
noise workplaces.

hock if rated EH

al Work Gloves Fire-Resistant (FR) Clothing & Arc-Rated PPE

e Why?
o Prevents burns from arc flashes and electrical fires.
© Cotton or fire-retardant materials should be used instead
of polyester (which melts onto the skin).
o For industrial/high-voltage work, wear ATPV-rated (Arc
Thermal Performance Value) arc flash suits.

avent electric

 

; from cuts,

lass 1 gloves (up

Head Protection — Hard Hat

Shield a « Why?
ballad : ;
0 Protects against falling objects (tools, materials, or
flying debris coer exposed cables).

o Reduces the risk of head injury from accidental contact
with overhead conductors.

17

ed

---

## Photo IMG_1621

Lockout/Tagout (LOTO) Equipment
« Why?
o Ensures equipment is isolated and cannot be je-
energised while work is in progress.
° Prevents accidental energisation of circuits that could
cause an electric shock.
o Always use a personal lock and keep the key with you.

2. Safety Protocols for Electrical Work

Job Hazard Analysis (JHA) — Why It's Important
A Job Hazard Analysis (JHA) is a step-by-step assessment of
risks before starting work. It helps identify:

- Potential electrical hazards.

- The right PPE and tools needed.

¢ Safe work procedures to follow.

- Emergency procedures in case of an accident.

A JHA should be completed before starting any new job,
especially in high-risk areas.

Signing In & Out of Site
« Why?
o Ensures everyone on-site is accounted for in case of an
emergency.

e Helps track who is working on specific electrical systems.

0 Required for safety compliance on construction and
mining sites.

0 Always sign in at the site office and sign out when

leaving site if this is a requirement.

ba eee

 
 
  
 
 
 
    

Electrical isolation &. Lockout

- Why? :
o Prevents accidental re:

>o Ensures no one works
necessary.

. Steps for Safe isolation:
o Identify the circuit to t
o Turn off the power at
o Lock out and tag the
eo Test for dead (alway:
power).

Note: Refer to correct LOT

Testing Before Touching
e Why?
oe Electrical circuits cz
off.
e Some circuits have
systems.
- Always test with a volt
also test on a known s

Working at Heights Safet
¢ Why?

o Falls are one of t

for electricians.
° Ensure ladders a
electrical work (fi
- Never use aluminiur
equipment.

---

## Photo IMG_1622

TQ).
Electrical Isolation & LOC out/Tagout (LOTS)

- Why? ae ircuits. S

innot be re- a o Prevents accidental re-energisation of a apsolutely

| o Ensures no one works on live systems unle .
rcuits that could necessary

the key with :
y ue - Steps for Safe Isolation:

o Identify the circuit to be worked on.

o Turn off the power at the switchboard.

© Lock out and tag the breaker with your name and date.

o Test for dead (always use a voltage tester to confirm no
power).

it
assessment of

Note: Refer to correct LOTO procedures on page 21:

Testing Before Touching
e Why?
© Electrical circuits can remain live even when they appear
off.
> Some circuits have back feed from generators or UPS
systems.
- Always test with a voltage tester before touching any wires,
also test on a known source to confirm the supply is isolated.

nt.

1ew job,

 

-in case of an

Working at Heights Safety
trical systems. VOTING g ty

Oe ee T° (Why?
ction an | o Falls are one of the leading causes of workplace injuries
a for electricians.
t when — o Ensure ladders are stable, secured, and rated for
é electrical work (fibreglass preferred).
ae pr : :
» Never use aluminium ladders when working near live

equipment.

---

## Photo IMG_1623

Emergency Procedures
« Why?
e Knowing what to do in case of electric shock, fire, or
injury can save lives.
e« Key Steps for Electric Shock:

e Do not touch the person while they are in contact with
electricity.

° Turn off power immediately if possible.
e Use a non-conductive object (wood, plastic) to move the
person away if the power cannot be turned off.
° Call emergency services (000 in Australia, 111 in NZ).
e If they are not breathing, begin CPR until help arrives.

POOocot

Lockout/Té

Standard Lockout/Tagot
Lockout/Tagout (LOTO) Is
prevent accidental energi
machinery during mainter
standard steps to ensure

1. Prepare for Shutdown
¢ Identify all energy sol

(electrical, hydraulic,
e Review the machine’
« Notify affected perso
¢ Inform other work gr
isolated.

2. Shut Down the Equip
- Power down the sys
(switch, push-buttor

- Ensure all moving

 

3. Isolate Energy Sourc
¢ Turn off and discor
Switch, etc.).
¢ For electrical syste
applicable.
* Block any stored ¢
Pressure, air press

---

## Photo IMG_1624

A i

    
    
    
     
 

 
  

out (LO
ckout/T ag ies si ical safety pro

  
  
 
  

electric shock, fire, OF
Standard Lo F
Lockout/Tagout (LOTO)! = n of electrical © cuits 4
hey are in contact with preven accidental energisal icing. Follow ines :
: machinery during maintenance
assible. ie standard steps to ensure safety.
ood, plastic) to move the ao Se
tt be turned off. 1. Prepare for snUn utdown
. Australia, 111 in NZ). sh . Identify all energy sources pes . equipment
L electrical, h draulic, pneume ic, etc.).
ee oil . ere: the eon procedures and potential hazards:
= . Notify affected personnel about the lockout procedure:
a ~ Inform other work groups in the area the equipment is being
) isolated.
ae
— 9. Shut Down the Equipment :. *
— . Power down the system using its normal operating controls Oe
r (switch, push-button, breaker, etc.).
ete stop.

 

Ensure all moving parts come to a compl

   
  
   
    
 

2 |solate Energy. Sources
» Turn off and disconnec
switch, etc.).
. For electrical sy
applicable.
- Block any store
pressure, air pres

t power sources (main breaker, valve,

stems, disconnect batteries or capacitors if

d energy sources (such as hydraulic
sure, or spring tension).

PACOOUOTC000D

---

## Photo IMG_1625

4. Apply Lockout/Tagout Devices
- Apply a lock to prevent activation of the power source wi
(padlock on breaker, switch, or valve). —

 

- Attach a tag to warn others that work is being performed and — ident
reactivation is prohibited. initial assessment a it
- Ensure each worker has their own lock and key—only they Se
should remove it. -
Safety Checks — Ensure g
workil

5. Release Stored Energy
« Discharge residual electricity from capacitors.
- Bleed off any hydraulic or pneumatic pressure.
- Secure mechanical parts that may still be under tension.

 

Diagram Analysis — Stu
how the circ!

6. Verify Isolation (Tryout Test)

———

- Attempt to start the equipment using normal controls (without
restoring power). =

- Confirm there is no movement or power to the system. j
- Use a voltage tester or multimeter to verify no electrical
voltage is present. —

» Once confirmed, return controls to the "off" position. .

 

Testing — Use the right

Diagnosis — |solate the
A out potential causes. D
experience; Sl

 

 

Te Repair — Rectify the is
7. Remove Lockout/Tagout & Restore Power a
Only after work is completed and all tools are cleared: !

pert

- Ensure all workers are safely away from the equipment. Final Check — Te
- Notify personnel that equipment is to re-energised. am: conditions to ens
- Remove only your own lockout/tagout device.

» Restore power gradually while monitoring the system. ——
Pro Tip:

Always assume there may be a second supply until proven
otherwise. Check for backfeed from generators, solar inverters,
UPS systems, or batteries before starting work. Backfeed is one
of the most common causes of unexpected live circuits during

maintenance. Note: Please find a

57) rear of this book.

---

## Photo IMG_1626

apts

is

    

process

   

   
  

The Fault-Finding

» power source

   

being performed and
cessaly

   

m and gather ne

 
 

initial Assessment — Identify the proble
information.

 

and key—only they

      

Safety Checks — Ensure all safety protocols are followed before
working on equipment.

     
   

tors.
ssure.
under tension.

diagrams to understand

   

Diagram Analysis — Study the wiring
how the circuit is designed to operate.

    
  
 

al controls (without Testing — Use the right tools to test circuits and components.

 
    

osis — Isolate the fault by analysing test results and ruling

       
     
   
     
    
 

     
 

the system. Diagn
no electrical out potential causes. Do not assume a fault based on a similar
- experience; still follow the correct procedure.
position.
Repair — Rectify the issue and verify that the system is working
a as expected.
>ared:
equipment. Final Check — Test the system under normal operating
gised. conditions to ensure everything is functioning correctly.
» system.
ti] proven

olar inverters,
ackfeed is one
cuits during

Note: Please find an easy to use fault finding checklist at the

rear of this book.
23

PatUMeenenn

---

## Photo IMG_1627

Initial Assessment
When arriving at the fault, spe
you to attend, and ask the follow
information:

. What was happening when the f
was a lightning strike nearby, ort
burning from the MCC room.

- Who was present when the fault

- Was anything turned on or off at t
fault?

- What circuit is turned 0
no longer operating correctly?

ak to the person who has alerted

ing questions for more

ault occurred? €.9- there

he operator could smell

occurred?
he time leading up to the

ff? Or what piece/s of machinery are

Review available documentation:
. Electrical schematics, wiring diagrams, and manuals

. Previous fault history and maintenance logs
. Manufacturer's troubleshooting guide

Identify the affected circuit or system:
is the fault in a single appliance, circuit, or an entire system?

Is there any visible damage, such as burn marks, loose
wires, or melted components?

Example: A customer reports that an RCD keeps tripping in a
residential circuit. You need to determine whether the issue is

caused by a faulty appliance, damaged wiring, or a nuisance trip.

 

safety Checks
Before attempting to diagnose
crucial to follow proper safety
equipment damage, and com
can pose serious hazards, in
and fire risks. The following :

before working On any elect

1. Isolate the Power Sour
Before touching any electri
power supply. This can be
circuit breaker, disconnect
removing fuses. Ensure th
prevent accidental shocks

2. Verify the Absence 0
Never assume a circuit |:
voltage tester or multime
present. Always test yo
proving unit first to enst

3. Follow Lockout/Ta
Lockout/tagout (LOTO
accidental re-energisa
breakers or switches |
indicating maintenanc
performing the work

---

## Photo IMG_1628

who has alerted
for more

ed? e.g. there
or could smell
ading up to the

f machinery are

nanuals

entire system?
‘ks, loose

ripping ina
the issue is
| nuisance trip.

SQEQCLQQTIINIIH

Safety Checks electrical faults, It 1S
Before attempting to diagnose and eee to prevent injury:
crucial to follow proper safety procedure ions Electrical faults
equipment damage, and compliance violation sat arc flashes:
can pose serious hazards, including electrocn ; ne completed
and fire risks. The following safety checks MUS

before working on any electrical system:

1. Isolate the Power Source
Before touching any electrical equipment, always isolate the
power supply. This can be done by switching off the relevant
circuit breaker, disconnecting the power at the main switch, OF
removing fuses. Ensure that the power is completely cut off to

prevent accidental shocks.

2. Verify the Absence of Voltage
Never assume a circuit is de-energised. Use an approved

voltage tester or multimeter to confirm that no electrical current is
present. Always test your voltage tester on a known live circuit or

proving unit first to ensure it is functioning correctly.

3. Follow Lockout/Tagout (LOTO) Procedures
Lockout/tagout (_OTO) procedures are essential for preventing
accidental re-energisation of equipment. Securely lock circuit
breakers or switches in the "off" position and attach a tag
indicating maintenance Is in progress. Only the person
performing the work should remove the lockout device.

---

## Photo IMG_1629

4. Use the Correct Personal Protec
n significant

Wearing the right PPE ca

injuries. ASSess what PPE is requir

speak with a supervisor.

5. Check for Environmental

Before beginning any fault-finding
environmental conditions that cou

slippery surfaces significantly
especially when working with

is dry and stable, and use insulated ma

when necessaly.

Poor lighting, excessive heat, confined spaces, and overhead or

tive Equipment (PPE)
ly reduce the risk of
ed for the task: if unsure,

Hazards
task, asSeSs the area for

ld compromise safety. Wet Or
increase the risk of electric shock,
live circuits. Ensure the work area

underground services can also present serious risks. Always

make sure the area is well lit and ventilated, and be cautious of

any potential trip hazards, wasp nests, Or vermin damage in
switchboards, ceilings, or outdoor locations.

6. Proper Earthing and Grounding

Ensure that the electrical system is correctly earthed to minimise
the risk of stray voltage or shocks. Earthing provides a safe path

for excess electricity to flow in the event of a fault.

7. Job Hazard Analysis (JHA) and Site Sign-in

Before starting any work, complete a Job Hazard Analysis (JHA)
or the appropriate paperwork to identify potential dangers and
implement necessary control measures. Additionally, signing in
and out of the worksite ensures that supervisors and emergency

personnel are aware of your presence.

By following these safety checks, electricians can work

confidently and efficiently while minimising the risks associated

with electrical fault-finding.

26

ts or appropriate footwear

       
         
   
       
     
  
   
  
  
 
 
  
 
 
 
  
 
 
 
 
 
  
 
 
 
  

| a |
ei
i
cS
re
—
—
ci
c—
aa
=
=
=
i

Diagram Analysis
Electrical diagrams are visual re
circuits or syStems- These diag
engineers, and technicians tO t
and potential faults within a Sy:
analysis allows 4 technician to
problems, assess electrical sy
reliable operation of electrical
important to update these dia
equipment have been chang
future problems Of misunder

Types of Electrical Diagra
Schematic Diagrams
« Schematic diagrams us
represent electrical cor
between them. They a
but focus on the functi
Components like rela)
transformers are repr
Understanding these

 

Single Line Diagrams (S
¢ Single Line Diagram
by representing thet
component is depic
especially useful fo
systems, showing |
system without the
connection.

---

## Photo IMG_1630

peemapes. — - .

 

art hers i AD ws

       

 
     

Sere Cn RE beneieentesite

     

 

       

 

 

me ~ rhe ree.

 

 

” eh en ROLLE A TA TT —_

   

ise sacsiibabiimen oe a

---

## Photo IMG_1631

ment (PPE)
he risk of
k; if unsure,

ie area for
Safety. Wet or
electric shock,
the work area
priate footwear

J overhead or
s. Always
cautious of
mage in

to minimise
a safe path

ysis (JHA)
ers and
igming in

rior ogy

i)
;

Fa
a=
—
=——
—
—
|
ce
ZS
—
—
eK

=

    

Diagram Analys! . al representation®
ical diagrams are viSU@l I! :
Electrical diag diagrams are cr

circuits or systems. These ean
engineers, and technicians to un pie diagram

and potential faults within a yee: ue troubleshoot
analysis allows a technician to eee ‘eure safe and
problems, assess electrical systems, 4 ig algo just aS
reliable operation of electrical equipment. "FI nents or
important to update these diagrams 4° ne with potential
equipment have been changed as this can help

future problems or misunderstandings.

Types of Electrical Diagrams

Schematic Diagrams
- Schematic diagrams use standardised symbols to

represent electrical components and show the relationships
between them, They are not concerned with physical layout
but focus on the functionality and operation of the system.
Components like relays, resistors, capacitors, and
transformers are represented by specific symbols.
Understanding these symbols is key to diagram analysis.

Single Line Diagrams (SLD)
- Single Line Diagrams simplify complex electrical systems

by representing them with a single line, where each
component is depicted symbolically. These diagrams are
especially useful for large-scale industrial or commercial
systems, showing how power is distributed across the
system without the clutter of multiple fines for each

connection.

---

## Photo IMG_1632

Wiring diagrams show fF
lines, which represent V
indicate different types

    

Block Diagrams

 

 

     
   
   
     
     
     
   
   
   
   
    
 
 
 
  

 

      

. Block diagrams are used to show the main functional oe
an electrical system. Each unit or component IS eee
as a "block," and connections between the blocks indicate
the flow of electrical signals or power. Block diagians are
useful for high-level system analysis, particularly In control
systems and larger systems with multiple interconnected
parts.

         
     
    
  

 
  

Reading and Interpreting Diagrams

« Understanding Symbols and Legends

o Electrical diagrams use symbols to represent
components, such as resistors, capacitors, switches, and
earthing. Familiarising yourself with the standard symbols
is the first step in diagram analysis. Most diagrams will
include a legend or key that helps you decode these

symbols. Be sure to study this carefully to avoid mistakes
in interpretation.
« Analysing the Wiring and Connections:

0 Understanding how wires connect components is
essential for tracing current paths and identifying fault
points. Pay attention to:

e Connection points (nodes, junctions)
0 Wire numbers or labels

e Wire colours (if noted — especially in site-specific

       
     
   

diagrams)

° Terminal designations (e.g., L1, N, PE, 13A, A1/A2 on Ps
contactors)

e Cross-referencing points (like wire tags that link to other +

parts of the diagram or panel)

> Solid Lines: Re
components.

e Dotted or Dast
connections, O

o Grounded Cor
denoted by a:
earth or grour

Component identifi
Recognising what e¢
switches control the
Identifying compone
each part in the circ

Power Flow Analy
Power flow througt
power source and
Identifying the dire
understanding the
faults. The flow of
typically shown w
system where po

---

## Photo IMG_1633

unctional units of

main f
represented

nponent is
in the blocks indicate

Block diagrams are
particularly in control
‘iple interconnected

5 represent
pacitors, switches, and

h the standard symbols
. Most diagrams will
you decode these
fully to avoid mistakes

components is
nd identifying fault

)
site-specific
E, 13A, A1/A2 on

gs that link to other

 

ae : ents 4
Wiring diagrams show h eae
lines, which represent wires OF nau 3
indicate different tyPe> of connection ce perween
> Solid Lines: R present hysica
components. econda ry
o Dotted of Dashed Lines: indicate optional ors
connections, Of signal paths.
are often
> Grounded Connections: Grounded omponems
e that connects to the

denoted by 4 special symbol oF lin
earth or ground point.

Component identification

Recognising what each compo
switches control the flow of current, whil
identifying components allows yOu to understand th

each part in the circuit and how they interact with each other.

Power Flow Analysis

ow through a system can be traced by starting at the

ing the path through the circuit.
identifying the direction of current and voltage Is crucial in
understanding the behaviour of the system and troubleshooting
faults. The flow of current through various components is
typically shown with arrows, which can help identify areas of the

system where powel might be disrupted.

Power fl
power source and follow

---

## Photo IMG_1634

*(blurry/unreadable photo — no text extracted, see image)*

---

## Photo IMG_1635

ti-Page Diagrams
prea

Cross-Referencing Mul
In larger systems, diagrams are often s

pages.

     
   
 

 
 
 

d across multiple

 
  
 
  
 

 

   

 

Cross-Referencing Multi-Page Diagrams
Look for:
- Page numbers or sheet references :
- Cross-reference tags (€.9., "See Sheet 3, Line 14")

. Terminal block markers (often shown on both ends of a wire

that passes between pages) oo
» Learning to track a signal or wire across pages |S vital in

complex troubleshooting.

 

 

         
        
      
     
    
   
 
 

  
     
    
 
   
   
 

 

 

Fault-Finding Using Diagrams
- Identifying Common Faults
. Faults often manifest as issues in power flow, such as:
o Open Circuits: Breaks or disconnections in the wiring that
prevent current from flowing.
> Short Circuits: Unintended paths that allow current to
flow where it shouldn't, often causing overloads or
damage to components.
© Overloaded Circuits: Diagrams can reveal if circuits are
carrying more current than they are rated for, which
could lead to overheating or failure.

 

    
     
     
   
   
     
   
 
 
 
 
 
  
 

  

Pro Tip:
Keeping a record of faults with the dates and time can help with
future problems and diagnostics.

 

. To diagnose faults,
circuit in the diagram

eee 1: Start by revi€
power SOUICES; conn
components.

o Step 2: Look for any
expected behaviour
observed behavioul

o Step 3: Trace the Pp
for areas where Cu

misdirected.

o Step 4: Focus on <
fail, such as switcl
continuity using a
the connections

Physical vs. Functiona
Many people new to dia
layout with the physical
Remember that diagrar
physically located. Are
contact it switches cou
things work together ft
they are located physi

line diagrams.

Note: Please find diff
the rear of this book.

---

## Photo IMG_1636

jiagrams

ten spread across multiple
grams

ces

2 Sheet 3, Line 14")

hown on both ends of a wire

e across pages is vital in

| power flow, such as:
9nnections in the wiring that

hs that allow current to
ausing overloads or

can reveal if circuits are
are rated for, which
ure.

and time can help with

 

ra ( f it HHH ' Hanae

e Faults the behaviour of the
mis functioning I"

 

Using Diagré
. To diagnose faults, ies eine ane
circuit in the diagram h
reality:
o Step 1:
power sources,
components.

o Step 2: Look
expected behaviour (base

observed behaviour (real-
>» Step 3: Trace the path of power! from t

for areas where current flow might be \

misdirected.
Step 4: Focus on areas where components are likely to
nd breakers. Check for

fail, such as switches, fuses, a
continuity using a multimeter to confirm the integrity of

the connections

 
   
   
    

ing the diagram to identify all
and load-bearing

 
   
 

start by review
connections,

  
   
     
   

ncies between the
) and the

    

for any discrep 7
don the diagram

life test results).
he source, looking

nterrupted OF

          
     
     
   
    
     
     
   
 
     
 
 
 
 
   
 
  
 
  
  
  
  
  
   

Physical vs. Functional Understanding
Many people new to diagram reading confuse the functional

layout with the physical layout.

Remember that diagrams don't always show where things are
physically located. A relay coil might be on one panel, and the
contact it switches could be on another. Understanding how
things work together functionally is more important than whe
they are located physically — especially in schematic or si é
line diagrams. yg;

Note: Please find different s :
ymbols assoc Se ds
the rear of this book. lated with diagrams at

---

## Photo IMG_1637

Testing |
a
After completing your diagram analysis and forming

hypothesis about the fault, begin your testing pnaers This siop =
critical, as it allows you to confirm suspicions, eliminate —
variables, and pinpoint the exact cause of failure. Always sta
with the least invasive testing methods and gradually move
toward more direct testing If required. Safety remains a priority
throughout.

Use the correct test equipment for the job, and ma
been checked for proper operation. Record your resu
dealing with a complex fault, need to communicate fin
others, or may need to return to the site.

ke sure it's
Its if you're
dings with

Start with the following checks and tests:
- Isolation Testing (Visual and Verification):
© Ensure the circuit you're working on is properly isolated.
Use a proving unit and a two-pole tester to confirm the
absence of voltage. Don’t rely solely on switches being
off — test for dead before starting.

- Continuity Testing (While circuit is isolated):

o Use your multimeter or insulation tester in continuity
mode to check conductors, fuses, and terminations. This
helps identify open circuits, broken wires, or loose
connections. For example, if a socket outlet has no
power, continuity testing can verify whether the phase

conductor is intact from the DB.

« Insulation Resistance Testing:

0 Test between phase, neutral, and earth conductors to
check for breakdowns or leakage. A low reading (e.g.

under 1 MQ) may indicate damaged insulation, moisture

ingress, or carbon tracking. Always ensure sensitive

equipment is disconnected before carrying out this
test.

PDDDDVDTOGNDD

morgen nnao

. Earth Fault A

 
 

  

oop Impedan
Measure the impedance
a fault occurs, the prote
the required disconnec
can point to poor earth
corroded connections.

°

. Voltage Testing (Live Te

> safe to do so, mea
circuit. Start at the or
toward the load. This
voltage stops — whi
location. Look for ur
incorrectly wired ter

- RCD and Breaker Tes
o Use an RCD teste
current thresholds

is nuisance trippin
operating correcth
downstream. For

wear, signs of ov

- Component Testinc
eo Test individual c
thermostats, an
simple failures ¢
manufacturer s

Note: Refer to Figure |
the correct testing seq

---

## Photo IMG_1638

and forming a

sting phase. This step is
ions, eliminate

of failure. Always Start
nd gradually move

fety remains a priority

), and make sure it's
rd your results if you're
municate findings with

ation):

in is properly isolated.
ester to confirm the

y on switches being

olated):

ster in continuity

id terminations. This
ires, or loose
outlet has no
ether the phase

h conductors to

nv reading (€.9.
silation, moisture

sure sensitive
yrrying out this

. Earth Fault Loop imp

> Measure the impedance :
fault occurs, the protectlv ,
: High loop

the required disconnection ume.
can point to poor earth continuity, Un

corroded connections.

- Voltage Testing (Live Testing): ane
> If safe to do so, measure the voltage at key points
circuit. Start at the origin (e.g. switchboard) and wO

toward the load. This helps you determine where the
voltage stops — which often narrows down the fault
location. Look for unexpected drops, phase Ioss, or

incorrectly wired terminals.

RCD and Breaker Testing:
Use an RCD tester to check the tripping times and

current thresholds of residual current devices. lf an RCD
is nuisance tripping, this test will help determine if it's
operating correctly or if there’s a leakage fault
downstream. For circuit breakers, check for mechanical

r, signs of overheating, or improper sizing.

°

wea

» Component Testing:
Test individual components such as contactors, relays,

thermostats, and sensors. Many faults come down to
simple failures of these devices. Compare readings to
manufacturer specifications where available.

°

Note: Refer to Figure 8.1 of AS/NZS3000:2018 when following
the correct testing sequence.

---

## Photo IMG_1639

. Functional Testing (If Applica aes system operation to seen O = . rminato
_ Wheto seals Dosey siee This can help uncover misse i iscrepan
see how the equipment respon operational os lace? ook for 1 Pa
faults that only appear under certain loads or Op re P e mm n Fau
iti consider { comm
conditions. dy to press the mos
> When functional testing, have someone ready eep In mt) ken connect!
the e-stop or turn off the breaker where necessaly. Loose OF bro - cor rosio
. Water ingress © ge toc
“ - ical dama'
Diagnosis - Mechan a in
; ts OF!
Once testing has been completed, begin the process Of : Overloaded circul ae
diagnosing the fault by interpreting your test results and , . Eailed components ; 2
observations. This is where you shift from gathering information ate Out One Thing at a :
multip!

thodical — don’t jump to
g this step is one of the

Avoid changing |
the diagnosis. Confirm

you're wrong, 9° back
condition.

Think Logically, Not Em

. Dont let frustration, t

your judgment. Stay ¢

the test results are te

to making logical conclusions. Be me
conclusions without evidence. Rushin
most common causes of misdiagnosis.

Compare your test results to expected values, and consider what
is normal for that system. Pay attention to patterns, such as
voltage present at the supply side but not the load side, or low

insulation readings between specific conductors.

Here’s a step-by-step approach to guide your diagnosis:

Review Test Results Carefully:
¢ Go through each test you performed and ask: what does this

result tell me? For example, if you measured voltage at the
switchboard but not at the appliance, where is it being lost?
What components sit between those two points?
Narrow Down the Fault Area:
- Use a process of elimination to isolate the part of the circuit
or system causing the issue. This might involve splitting the
circuit, isolating loads, or testing in segments to localise the

problem. as

Repair

Once the fault has beer
carry out the repair. Thi
and attention to detail t
correctly, and in a way

 

Always follow the app
me guidelines when reple
tempted to take short
compliance, or reliab

---

## Photo IMG_1640

system operation to
his can help uncover
| loads or operational

eone ready to press
ere necessary.

process of

results and

thering information
— don't jump to
ep ts one of the

and consider what
ems, such as
nad side, or low

Ss

jagnosis:

k- what does this
i voltage at the
is it being lost?
nts?

art of the circuit
ve splitting te
to localise the

: ith the Diagram: |
te am and compare it with what you ve
omponents in the path you
and connections in the right

tween theory and reality.

Cross
. Revisit the wiring diag!
seen on site. Are there any ©
missed? Are the terminations
place? Look for discrepancies be
Consider Common Fault Patterns:
Keep in mind the most common causes of faults:
- Loose or broken connections

« Water ingress OF corrosion
. Mechanical damage to cables or components

- Overloaded circuits oF incorrect cable sizing
- Failed components (€.9. contactors, Sensors, fuses)
Rule Out One Thing at a Time:
. Avoid changing multiple things at once — this can confuse
the diagnosis. Confirm each finding before moving on. lf
you're wrong, gO back to the last known good reading OF

condition.

Think Logically, Not Emotionally:
Don't let frustration, time pressure, OF assumptions cloud

your judgment. Stay objective, and always go back to what
the test results are telling you.

Repair
Once the fault has been accurately diagnosed, the next step Is to

carry out the repair. This stage must be approached with care
and attention to detail to ensure the fault Is rectified safely,

correctly, and in a way that prevents recurrence.

Always follow the appropriate standards and manufacturer
guidelines when replacing or repairing components. Don't be
tempted to take shortcuts, especially in systems where safety,

compliance, or reliability is critical.

35

---

## Photo IMG_1641

. jr process:
Here are key points to consider during the repall P
Confirm Isolation Again:

- Before handling any cabl :
the circuit is isolated and proven dead.

required. Safety always comes ie
epair Faulty Components:
peter: has aed (e.g. a relay, conn Ve
switch), replace it with one of the same rating and |
specification. Avoid using oversized protection devices to
“solve” a tripping issue — this is dangerous and non-
compliant. If the repair involves a cable or conductor, USe
proper joining methods and insulation techniques.

Fix Root Cause, Not Just the Symptom:

- For example, if a fuse has blown, ask why it blew — was It
due to overload, a short circuit, or a failing load? Simply
replacing it without resolving the underlying issue may lead
to repeated faults.

Ensure Correct Terminations and Tightness:

- Loose terminations are one of the most common causes of
faults. After making any connections, use the correct torque
settings if specified and double-check all terminations for
security.

Document Any Changes:

« If your repair involves changes to the system layout, wiring,
or control logic, make sure it's documented clearly. Update
drawings if needed, and communicate the change with the
relevant people (e.g. the maintenance team or site
manager).

Test After Repair (Before Re-Energising):
« Perform insulation resistance, continuity, and visual checks
before powering back on. This helps catch any installation

faults or errors before the circuit is live again.

i at
es or components, reconfirm 3
Lockout/tagout

e, or

   
    
   
   
 
   
    
    
 
 
 
  
   
  
  
 
 
 
  
  
 
 
 
 
  
  
  
  

 

 

Final Ch

 

eck
after comple

safely,
Never assum
— proper veri
professional repalr.

€ o
fication |!

quick flick of th
rtup, anc
g as th

Go beyond a
the system's full sta

systems are operatin

Include the following steps |
Re-Energise Safely:
. Inform others before Fr

. Switch the supply back
signs such as sounds,
ready to isolate again

Functional Testing:

- Operate the equipms
normal functions. Ch
responding correctly
and protective devic

Monitor for Hidden Is:
- Some faults may n
let the system run |

an eye on tempere

eon stress or overload

---

## Photo IMG_1642

Iuring the repair process:

   

Final Check . thorough
After completing the repal' it's esol 0 ee

is fun
final check, This ensures the system IS g conditions.

safely, and as expected under normal OPE'S” 1 - gone
Never assume the job is finished just because

ix from a
— proper verification is what separates a rushed fix fro

professional repair.

        
   
  
 

Ir COMponents, reconfirm that
fen dead. Lockout/tagout if
S first.

onents:

|. a relay, contactor, fuse, or
he same rating and

sized protection devices to
S dangerous and non-

a Cable or conductor, use
lation techniques.

jptom:

1, ask why it blew — was it
r a failing load? Simply
underlying issue may lead

he switch — test it properly, observe

Go beyond a quick flick of t
ety and control

the system’s full startup, and ensure all saf
systems are operating as they should.

Include the following steps in your final check:
Re-Energise Safely:
- Inform others before re-energising.
- Switch the supply back on while observing for any abnormal
signs such as sounds, smells, or unexpected behaviour. Be

ightness:
ready to isolate again if needed.

/»most common causes of
1s, use the correct torque

ck all terminations for Functional Testing:

- Operate the equipment or circuit through its full range of
normal functions. Check that all parts of the system are
responding correctly — including control systems, sensors,

e system layout, wiring,
and protective devices.

1ented clearly. Update
e the change with the

> team or site Monitor for Hidden Issues:

- Some faults may not appear immediately. Where possible,
let the system run for a few minutes to ensure stability. Keep

and visual checks —= an eye on temperature, current draw, and any other signs of

atch any installation hoes
again.

 

stress or overload.

---

## Photo IMG_1643

ult is Resolved:
fault, gO back and explain

m that the system is NOW
s well.

Original Fa
y reported the
d fixed. Confir
heir point of view a

Confirm the

If someone jnitiall
what was found an
behaving correctly from t

 
  
  
   
   
    
 
 

   

Restore the Site:
cuts, of pac
Leave the work are

Clean Up and
. Tidy up any tools, off overs,
guards, and signage.

better than) you found it.

     
       
    
  
 
   
   
  
 
 
 
 
 
 
  

kaging. Restore all c
a as good as (or

Log the Work Done:
If required, write a

was found, what testin

This can be valuable fo

troubleshooting.

. Include the time, date and equipment replaced which is

useful information for future faults.

fault report or service note detailing what
g was done, and what was repaired.
r future maintenance Of

Real-World Example: Hydraulic Equipment Not
Reversing

Fault Description:
While on-site, | was approached by the auto-electrician who

reported that a piece of hydraulic equipment (fed from a 230V
supply) was only moving forward, but would not operate in
reverse when the reverse button was pressed on the hard-wired
remote connected to the control panel.

Bowe
a

Step-b
4° initial Asse

What was hap

y-Step walkthrough Using the |

ssment
| began by speaking with the auto-st

| asked:
pening when the fault

“ve were operating the geal when |

still goes forward fine.”

Who was there at the time?
“Just me. | Was operating it mysel

Was anything recently changed ¢
“No changes, but It's been rainin

What exactly isnt working?
“The reverse function from the |

perfectly.”

This narrowed it down to the ¢
operation.

2. Safety Checks
Before opening anything, | 1
where needed.
+ | checked for stored ene
- | verified the 230V cont
on the remote and pan

---

## Photo IMG_1644

It is Resolved:
orted the fault, go back and explain
2d, Confirm that the system is now
their point of view as well.

Site:
,, OF packaging. Restore all covers,
ve the work area as good as (or

ort or service note detailing what
; done, and what was repaired.
re maintenance or

uipment replaced which is
aults.

iulic Equipment Not

‘the auto-electrician who
uipment (fed from a 230V

it would not operate in

; pressed on the hard-wired

>|.

EE ee

BD aces,

Cn

P

ee

. ae

- ding Process:
Step-by-Step Walkthrough using the Faul ete

1. Initial Assessment
| began by speaking with the
| asked: e
What was happening when the fault occurred? aa on ween
“We were operating the geal when it just StOPP
still goes forward fine.”

auto-sparky tO get more details.

Who was there at the time?
“Just me. | was operating it myself.

ntly changed or worked on?

Was anything rece
ff and on.”

“Nio changes, but it's been raining O

What exactly isn't working?
“The reverse function from the remote —

perfectly.”

forward still works

This narrowed it down to the control or signal side of the reverse
operation.

2. Safety Checks
Before opening anything, | made sure the system was isolated

where needed.
« | checked for stored energy in the hydraulic system.
« | verified the 230V control feed was isolated before working

on the remote and panel internals.

---

## Photo IMG_1645

| began testing the

. Remote Push Button:

tested the contacts on the

o Contacts were working as eX

properly.

- Continuity Testing: Moved on to
remote back to the panel.

o Found 2 of the 8 cores had no continuity

one responsible for the reverse signal.

- Visual Inspection: The cable showed signs

from repeated bending or physical damage.

housing and

    
 
     
    
   
    
    
   
     
  

Opened the remote
reverse button.
pected — switching

checking the wiring from the

   
      
     
   
   
 

— including the

of wear, likely

 
 

5. Diagnosis
The fault was isolated to the damag

the remote and the panel.
- The reverse signal wire was one of the damaged conductors.

- No issues were found with the remote, control relays, Or
actuators — just the cable.

  
 
  
 

ed multi-core cable between

     
    
     
  

; Re
_ Diagram Analysis
feed the wiring physically with the matching core numbers as Ce ually S
there was NO wiring diagram available. | then traced outa quick cou me ane e
wiring diagram to match the control panel to help and for future i able 0 ue 4 reste
damage: ; re
se. “ oo
= Identified the wiring path from the remote push buttons to the — eA terminatlo é \38 cores bd =
control panel inputs. a : verified cont oe one ae al
. Confirmed that each direction (forward/reverse) had its own ; reinstalled rem
signal core back to the panel. —
[fe
deers = 7. Final Check
most likely components: ‘ind:
After re-energising:
ard and reverse fur

. Tested both forw
Confirmed the system oper

conditions.
Observed operation OV
Reported the cause an

supervisor.
- Cleaned the area, labelled the ne

repair in the job \og.

ated cor
er several C
d fix to the |

Key Lesson:
Even simple faults like a reverse fur

time-consuming downtime if not ap
Starting with the basics and workin
assumptions — helped isolate the

---

## Photo IMG_1646

the matching core numbers as
ble. | then traced out a quick
panel to help and for future

1e remote push buttons to the

ward/reverse) had its own

nents:
remote housing and

button.
ected — switching

ecking the wiring from the
sontinuity — including the

signal.
1 signs of wear, likely

amage.

ulti-core cable between

e damaged conductors.
» control relays, OF

 

  
  
  
  
 
  
  
    
 
   
  
  
 
 
 
  
 
   
  
 
 
 
  
  
  
  

6. Repair bo
| replaced the damaged © b : “ a
could not visually see W ere the eae «to pre rep
cable of the same spec and prope! st
damage.

- All terminations were redone and tested. erhalten

. Verified continuity on all 8 cores before Po a

. Reinstalled remote and secured all enclosures:
7. Final Check

remote.

After re-energising:
- Tested both forwat
. Confirmed the system operate

conditions.
. Observed operation over
Reported the cause and
supervisor.
Cleaned the area, lab
repair in the job log.

e functions on the

d and revels
tly under normal

d correc

several cycles — 10 further ISSUES.
fix to the auto-sparky and site

elled the new cable, and noted the

 

Key Lesson:

Even simple faults like ar an lead to
time-consuming downtime |!
Starting with the basics and

ptions — helped isolate t

everse function not working C
f not approached systematically.
working step by step — without

assum he fault efficiently.

---

## Photo IMG_1647

UTPMENT

 

Multimeters

Basic Uses of a Multimeter
and technicians

r electricians
on main functions.

A multimeter is an essential to
typically has four

to measure electrical values. It
1.Measuring Voltage (V)
© DC Voltage (=v): Used

electronics. pe
> AC Voltage (~V): Used for household outlets, ™

power, and appliances.
> How to Use: Set to the correct voltage range, place

probes on the circuit, and read the display.

2.Measuring Current (A)
o DC Amps (=A): Used for circuits with batter

power SOUICEeS.
o AC Amps (~A): Used in appliances, motors, and AC

systems.
> How to Use: Set to the correct range, connect in series

with the circuit (use clamp meters for high current).
3. Measuring Resistance (Q)
o Checks for continuity, broken wires, or faulty
components.
o How to Use: Set to Q, touch probes across the
component, and check resistance value.
4.Continuity Testing (Beep Mode)
0 Checks if a circuit is complete (useful for fault-finding).

for batteries, POWET supplies, and

ies or DC

o How to Use: If it beeps, there's a complete path. No beep

= break in the circuit.

---

## Photo IMG_1648

Advanced Uses of a Multimeter

Beyond basic voltage, current, and resistance measurements, a
multimeter can be used for advanced troubleshooting and
diagnostics in electrical and electronic systems. The following
sections explore these advanced features and their practical
applications.

1. Measuring Frequency (Hz)
Purpose: Checking the frequency of AC power SOUICEs, motor
drives, and generators.
How to Use:
« Set the multimeter to Hz mode.
- Place the probes across the AC supply or signal source.
- Read the frequency value on the display.
Example: Ensuring a generator output is at the correct SOHZ

(NZ/AU) or 60Hz (US) frequency.

2. Measuring Capacitance (F - Farad)
Purpose: Diagnosing capacitors in power supplies, motor start

circuits, and electronic devices.
How to Use:
- Set the multimeter to capacitance mode (F).
» Discharge the capacitor before testing.
» Connect the probes to the capacitor terminals.
» Read the capacitance value and compare it to the rated
value.
Example: Checking a motor run capacitor in an air conditioning

unit to see if it is holding charge or failing.

       
        
        
    
       
      
 
 
 
  
 
  
 
  
 
 
  
 
 
 
 
 
 
  

 

Oe,

3, Measur

   

ing Duty cycle (%) a
| enon PWM (Pulse width Moe

ollers, and dimmers.

 
 
 
 

purpose: DI
motor cont

ow to USE:
= Set the meter to duty cycle mode (%).

| source.
. Probe the PWM signa oo |
. Read the percentage of the “on ime versus

Example: Testing the duty cycle of a variable-SF
to ensure it Is operating correctly.

   

4. Measuring Temperature (°CI°F)
Purpose: Monitoring heat buildup in electrical
checking HVAC temperatures, Of diagnosing |
circuits.

How to Use:
- Connect a thermocouple probe to the m

. Set the meter to temperature mode.

. Place the thermocouple on the compon
. Read the temperature on the display.
Example: Checking the temperature of an |

diagnose potential overheating issues.

5. Measuring Low-Voltage Millivolts (m
Purpose: Diagnosing small voltage signa
including sensors and control systems.
How to Use:
« Set the multimeter to millivolt (mV) r
- Place the probes across the small v
« Read the display.
Example: Measuring the output of a thi
industrial process to check for correct

---

## Photo IMG_1649

ultimeter

nd resistance measurements, a
1ced troubleshooting and
ronic systems. The following
features and their practical

of AC power sources, motor

> supply or signal source.
1e display.
put is at the correct 50HZ

rad)
\ower supplies, motor start

> mode (F).

Sting.

tor terminals.
sompare it to the rated

itor in an alr conditioning

ng.

LEIP OPO Doan note

tht

    
   
   

; %)
suring Duty cycle ( ae
e: Diagnosing pwn (Pulse width

d dimmers:

3. Mea
Purpos
motor controllers, 20
How to Use:

- Set the met
Probe the PWM signal source.

Read the percentage of the “°
ty cycle of aV

correctly.

a time versus “off?
ariable-speed m

Example: Testing the du
to ensure it Is operating

g Temperature (°CI°F)
at buildup in electrical

Ss, OF diagnosing

components.
overheating

4. Measurin
Purpose: Monitoring he
checking HVAC temperature

circuits.

How to Use:
e Connecta thermocouple probe to the m

- Set the meter to temperature mode.
- Place the thermocouple on the component to measure.

Read the temperature on the display.
ecking the temperature of an electrical panel to

heating ISSUES.

ultimeter.

Example: Ch
diagnose potential over

Voltage Millivolts (mV)

5. Measuring Low
| voltage signals in sensitive circuits,

Purpose: Diagnosing sma
including sensors and control systems.
How to Use:
» Set the mult
» Place the prob
» Read the display.
Example: Measuring the
industrial process to check fo

imeter to millivolt (mV) mode.
es across the small voltage source.

output of a thermocouple sensor in an
r correct operation.

     
 

45

Ben

---

## Photo IMG_1650

CAT Rating?

The Categoly (CAT) rating is a safe

where 4 multimeter can be safely use
voltage (spikes OF surges) it can handle.
crucial for electrical safety, ensuring that the m
for the type of environment you're working in.

ty classification that defines
d and how much transient

These ratings are
eter IS designed

What is 4

  
  

Multimeters are classified into four CAT (Category) ratings:

CAT! - Low Energy. Circuits
Used for electronic devices and low-energy

. Description:
circuits, such as
. Examples: small electronic

testing.

. Voltage Rating
energy environments.

« Risk: No protection against p

electricity.

battery-powered equipment.
s, circuit boards, and signal

s: Typically up to 600V, but only safe in low-

ower surges from mains

Household Circuits

CAT Il - Standard
lectrical appliances that

- Description: Designed for testing e€
are plugged into outlets.

- Examples: Power tools, eX

- Voltage Ratings: Up to 1000V

multimeter).
Risk: Limited protection from power Surges, N

tension cords, office equipment.
(depending on the

ot for industrial

USE.

 

an

 
  

panel or branch circuits.
ds, three

Examples: Switchboat :
and commerce!

lighting systems;
Voltage Ratings: GO0OV OF 4000V
Risk: Protects against hi
ments.

industrial environ
CAT IV = High Energy, Utility-Level Testing
power lines, elect

. Description: Used for main
and outdoor installations before the distribut
Examples: Transformer connections, undet

and main service panels.
Voltage Ratings: G0O0V to 4000V OF higher.

Risk. Designed to withstand large power s
against the highest electrical hazards.

---

## Photo IMG_1651

ing?

is a safety classification that defines
safely used and how much transient
t can handle. These ratings are
ensuring that the meter is designed

you're working in.

o four CAT (Category) ratings:
Ss

-tronic devices and low-energy
owered equipment.
cs, circuit boards, and signal

up to 600V, but only safe in low-

power surges from mains

Circuits
sting electrical appliances that

 

nsion cords, Office equipment.
V (depending on the

power Surges; not for industrial

[een

CODD OD0DDEEIDOE

CAT IlL=Industrialand COMP
CAT Il - Indus suring directly at the

CAT IV — High Energy, Utility

  
 

rcial applications

« Description: Suitable for me
panel or branch circuits.
- Examples: Switchboards, three-phase © '
lighting systems, and commercial electrical panels.
- Voltage Ratings: 600V oF ,000V (de
Risk: Protects against high transient V

industrial environments.

-Level Testing

Description: Used for main powet lines, ele
and outdoor installations before the distributi
Examples: Transformer connections, undergo
and main service panels.
- Voltage Ratings: GB00V to LO00V oF higher.

. Risk: Designed to withstand large power sur

against the highest electrical hazards.

ctrical meters,
on panel.
und cables,

ges and protect

---

## Photo IMG_1652

Insulation Resistance Testers

What is an Insulation Resistance Tester? risa
An insulation resistance tester, commonly called a eons cal

specialised device used to measure the resistance of electr!
insulation. It applies a high DC voltage (typically 250V, 500V,
1000V or more) between conductors and between conductors
and earth to test how well insulation resists current leakage.
This test helps identify deterioration, moisture ingress,
contamination, and breakdown in electrical systems before
failures occur.

Refer to AS/NZS 3000:2018 Clause 8.3.6.2 for requirements
related to the voltage requirements for testing insulation

resistance.

Common Uses of an Insulation Resistance Tester

1. Electrical Wiring and Cable Testing
- Ensures insulation integrity in mains wiring, underground

cables, and distribution boards.
- Identifies damaged or degraded wiring before failure occurs

2. Motor and Transformer Testing
« Detects insulation breakdown in motor windings and

transformer coils.
¢ Helps diagnose short circuits and overheating.

3, Testing Electrical Panels and Switchgear
¢ Evaluates insulation in circuit breakers, busbars, and control

panels.
« Ensures compliance with electrical safety standards.

Note: Insulation resistance testing must only be performed ona
de-energised circuit. Always confirm zero voltage, prove
isolation, and ensure the circuit is safe before testing. Testing
may be carried out at up to twice the circuit's nominal (rated)

voltage.
d 50

 

4. Generator and UPS S

ystem Mainte
in back

insulation failure If) “*

- Prevents insu disruptions

. Reduces risk of powel

a ications
. Mining Applicatio
5. Industrial and g ronme

- Essential for hazardous envi oe
failures can cause Semous ace
. Used in HVAC, manufacturing ple

operations.
How to Use an Insulation

1. Safety Precautions
Always disconnect the circuit fro

de-energised before testing.
Discharge all capacitors and sto
Warn others that insulation testi
Never touch the test leads or ci

measurement.

2. Set Up the Tester
« Select the appropriate test volt
circuit:
e 250 V for extra-low voltags
¢ 900 V for low-voltage sin

circuits
° 1,000 V for higher voltage

and equipment rating)

3. Connect the Test Leads
> Connect one lead to the co
* Connect the other lead to e'
© Earth, or
© Another conductor (whe

---

## Photo IMG_1653

4. Generator and UPS System Maintenance
- Prevents insulation failure in backup POWe
« Reduces risk of power disruptions.

5. Industrial and Mining Applications

- Essential for hazardous environments where |
failures can cause serious accidents.

- Used in HVAC, manufacturing plants, and mining
operations.

istance Testers r systems.

 

   
      
 
 
  

  

ice Tester?

‘ommonly called a Megger, isa
ure the resistance of electrical
tage (typically 250V, SOOV,
tors and between conductors
on resists current leakage.

nN, moisture ingress,
electrical systems before

    
 
     

nsulation

     
 

 
 

How to Use an Insulation Resistance Tester

  
 

 
 

e 8.3.6.2 for requirements
for testing insulation

1. Safety Precautions
- Always disconnect the circuit from the supply and verify itis
de-energised before testing.
- Discharge all capacitors and stored charges in the circuit.
e Warn others that insulation testing is about to take place.
- Never touch the test leads or circuit under test during

measurement.

 
   
   
 

2sistance Tester

g
ins wiring, underground

 
      
  
 
  
 
  
  
  
 
 
 
 
 
 
   

we ° Ss.
viring before failure occur 2. Set Up the Tester

- Select the appropriate test voltage for the equipment or
circuit:
o 250 V for extra-low voltage circuits

otor windings and

 

eee: o 500 V for low-voltage single-phase and three-phase
year gz 5
rs. busbars, and control — circults :
a © 1,000 V for higher voltage systems (check the standard
fety standards i and equipment rating)
afe
r 3. Connect the Test Leads
nly be p efformed on a | » Connect one lead to the conductor you wish to test.
) voltage, Prove — ) » Connect the other lead to either:
ore testing. Testing : > Earth, or
t's nominal (rated) > Another conductor (when testing between conductors).

51

---

## Photo IMG_1654

for manual testers) t

4. Perform the Test
turn the crank (

- Press the test button OF
apply the test voltage.

- Observe the resistance reading.

ow a resist

- Ahealthy circuit should typically sh
igher — refer to ASINZS 3000:2018

range of 1 MQ orh
Clause 8.3.6.2 for minimum acceptable values.

ance in the

ults
g. >1 MQ): Good insulation.

MQ): Possible deterioration, moisture

5. Interpret the Res

- High resistance (e.

- Low resistance (e-9. <1
ingress, or damage.

- Very low resistance (near zero): Short circuit or severe

insulation failure.
further and

tance is lower than acceptable, investigate

If the resis
repair before energising the circuit.

6. After Testing
- Discharge any residual voltage from the circuit by shorting

conductors to earth using an insulated tool.

- Remove test leads.
- Record results for compliance and maintenance records.

Pro Tip:
Before using an insulation resistance tester, consider whether

the circuit contains any sensitive electronic equipment or Is

connected to an RCD. Sensitive devices can be damaged by the
high test voltage, and RCDs may cause unexpected low or failed
readings. Isolate or disconnect these components before testing

whenever possible.

 

ris a
clamp mete
5 ameters

electrical pat
conductors: .
electricians to take curr a
making them an essentt
electrical systems:

p Meter Works

A clamp metet operates using 5

transformet to detect magnet |
convert them into an electrical
contact current measurements

circuit.

How a Clam

Uses of a Clamp Meter in Fé
Measuring AC and DC Curre
. Used to check if a circul
current draw of equipme
Helps determine if a bre
- Essential for diagnosin

systems.

Detecting Faulty Compe
~ Asudden drop in cur
or an open circuit.
- Anexcessive curre
insulation breakdo

---

## Photo IMG_1655

*(blurry/unreadable photo — no text extracted, see image)*

---

## Photo IMG_1656

tire h- £¥ ee ay
the crank (for manual testers) to

- Short circuit or severe

able, investigate further and

m the circum by shorting
fed tool.

naintenance records.

ter. consider whether
ic Equipment OF IS

“an be damaged by the
nexpected low or failed
xonents before testing

  

Td

————

Clamp Metet

ris a versatile diagnostic tool i
t the need for dire
| multimeters.

rements safe
t-finding in various

 

A clamp mete
electrical parametefs withou
conductors. Unlike traditiona
electricians to take current measu
making them an essential tool for faul

electncal systems.

       
    
     
    
    
   
 
  
 
  
 
 
 
 
 
 
 
 
 
 
 
  
 
   

How a Clamp Meter Works :
A clamp meter operates using a Hall Effect sensor Of 4 curren

transformer to detect magnetic fields around a conductor and

convert them into an electrical reading. This allows for non-
contact current measurements, eliminating the need to break the

circuit.

Uses of a Clamp Meter in Fault Finding

Measuring AC and DC Current

Used to check if a circuit is overloaded by measuring the
current draw of equipment.

Helps determine if a breaker is correctly rated for the load.
Essential for diagnosing unbalanced loads in three-phase

systems.

Detecting Faulty Components
- Asudden drop in current may indicate a failed motor winding

     

or an open circuit.
. An excessive current draw could suggest a short circuit or

insulation breakdown.

---

## Photo IMG_1657

Checking Inrush Current
. Measures the initial surge of curren

transformer starts.
- Useful for diagnosing tripping issues
Circuit Breakers) and fuses. a
Overloade

t when a motor or

 
    
 

 
  

  

with MCBs (Miniature
dg circuit

  
 
     

Identifying Leakage Current
- Measures small residual currents flowing through the earth, =

helping to detect insulation faults before an RCD trips. bs

e Helps diagnose nuisance tripping of RCDS.
- Requires a dedicated leakage current tester OF clamp meter

designed to accurately measure Very low current levels. =

    
   
   
 

Ln

     
   

Advanced Models)

Measuring Voltage and Resistance (
functions, allowing for

- Some clamp meters have multimeter

voltage, resistance, and continuity checks. |

 

. Useful when troubleshooting power supply issues alongside

current measurements.
Motor Failure

Best Practices for Using a Clamp Meter
JY Ensure the meter is rated for the voltage and current being |
ome

measured.
J Only clamp around a single conductor; clamping around

 

 

multiple wires will give incorrect readings. a
J Position the clamp properly—placing it near high-interference == wae
areas can affect accuracy. Nuisance RCD Upon
J Use the correct measurement mode (AC or DC) based on the a
application. a4
J Verify readings with a secondary test if values seem
inconsistent. —
1 tet

High Resistance Joins

te

---

## Photo IMG_1658

Current

nitial surge of current when a motor Or
rts.

Osing tripping issues with MCB

S (Miniaty
) and fuses. fe

e Current

residual currents flowing through the €arth
insulation faults before an RCD trips. 7
luisance tripping of RCDs.

ated leakage current tester or clamp meter
ately measure very low current levels.

nd Resistance (Advanced Models)
‘Ss have multimeter functions, allowing for
, and continuity checks.

>shooting power supply issues alongside
nts.

1g a Clamp Meter
ated for the voltage and current being

single conductor; clamping around
orrect readings.
perly—placing it near high-interference

rement mode (AC or DC) based on the

2condary test if values seem

HEEOND DCD .oggeo tetas

 
 
   

Measur
and com

rating

aker

   

e
ircul are tO br
Overloaded circult 0

 

  
    

 
  

Check for unbalanced
phase currentS

    

  

Transformer Faults

  
    

  
 

Check for high inrush or
low current draw

 
 

Motor Failure

  
  

  

Measure leakage current
to earth

  

  

Nuisance RCD Tripping

   
   
    

 
  
 

Compare voltage drop
and current between
connections

  

High Resistance Joins

---

## Photo IMG_1659

> 30mA RCD: Must tri
> 30mA RCD: Must trip

(150mA).

within 40ms at 5x rated current

RCD trip-time (injection) tests,
always test at the furthest point of the final sub-circuit (e.9.
socket-outlet). Testing directly at the switchboard is not
compliant with AS/NZS 3017, because it doesn't prove
of the circuit wiring and outlets.

At the switchboard, the push test
method of confirming device operation.

Pro Tip: When carrying out
protection

button is the only accepted

nents
critical safety compo
S (RCDS) ae nt electrical juggish. ae
residual current Device 7 electric snOc™ cel Een See Nuisance TPP 0 is ‘
: tO protect agal ‘a, the correct opera ion O -— Checking a
ere fer is Usee : itivi tifie nether! tt
fires. AN RCP ee trip time and sensitivity. iden M “ren
RCDs b measuring ie A RCU tester IS essential for ‘ measures e
ial, an
nee fe nosing faults in domesilc, commercial,
electric! ;
tems. Testin
industrial electrical sys , Confirms hat {he
a | ult situation.
How 2 ECO lance between live and earilg liance with W
An RCD continuously monitors the balan , - ensures cO mplia ”
er currents ina circuit. If an imbalance occuls (typically ensuring Trip Time & sensiti
Pied py current leakage to earth), the RCD disconnects power Zl ~ checks the RCD'S respor
| Le d current
milliseconds £0 preven 4/2x, 1x, Dx rate c
ED eee estings: LOMA, 30mA, LOOMA, 300mA, and 500mA. = ( ) nee
. Typical Rating>: | . Ensures it meets the t Q
_ standard Trip Times: . =—s
within 300Ms at rated current.
: Best Practices for Using an!

, J Test at the origin of the ©

|

J use the correct test sett
J Perform tests at both 0°
J Record results to COMP:
J \f an RCD fails, ins|

—
a

a leakage iSSUeS.
c—s
Note. Type-AC RCD
cs current A x
s and cannot res
Em faults created by moder

may fail to trip when ¢
leaving people unprot
are no longer recomm«

-

ro

---

## Photo IMG_1660

CD Testers

(RCDs) are critical safety components
t electric shock and prevent electrical
od to verify the correct operation of

jp times and sensitivity.

sn RCD tester is essential for

; in domestic, commercial, and

s the balance between live and

an imbalance occurs (typically
arth), the RCD disconnects power

arm.
nA, 100mA, 300mA, and 500mA.

thin 300ms at rated current.
hin 40ms at 5x rated current

trip-time (injection) tests,

‘the final sub-circuit (€.9.

he switchboard is not

use it doesnt prove protection

utton is the only accepted
ion.

SCOT O DIOL OooREeoooeeD

  
 
  
 
 
 
    
 
    
   
 
   
   
  
 
 
 
 
   
 
 
 
 
  

: inding
Uses of an cp Testet in Fault A -
a : ave fimits:
a tion ad time im
Verifyin pcp Operse arin the require or
ee RCD trips Wt 1 unctional d not stuck

. Ensures the
« Confirms that the device !
sluggish.
Checking Nuisance Tripping on et
- Identifies whether an RCD is OV ae
. Measures leakage current to dete

leakage |S present.
tection

Testing Earth Fault Pro “
. Confirms that the RCD correctly discon

earth fault situation.
. Ensures compliance with wiring regulations.
Measuring Trip Time & Sensitivity
- Checks the RCD's response
(1/2x, 1x, 9x rated current).
. Ensures it meets the requir

ye or faulty.

if excessive

cts power! in an

time under different conditions

ed disconnection time.

Tester

Best Practices for Using an RCD
first before testing downstream.

J Test at the origin of the circuit
JY use the correct test setting (A, oF B type RCDs).
J Perform tests at both 0° and 180° phases for accurate results.

J Record results to compare against regulatory limits.
J |f an RCD fails, inspect wiring and connected loads for

leakage issues.

Note: Type-AC RCDs only detect pure sinusoidal AC leakage

currents and cannot respond to pulsating DC or high-freque :

faults created by modern electronic equipment. This ae ney

may fail to trip when dangerous leakage currents are s they

leaving people unprotected. For this reason, Type-AC armel

are no longer recommended and should be replaced with —
e

---

## Photo IMG_1661

Fault Loop Impedance Testing

conductors).

- la = Fault current required to trip the breaker.

Pro Tip: A fault loop impedance test doesn't just check numbers
it confirms the MEN link and earthing system are intact. If the

MEN link is missing OF disconnected, the earth fault current may
not return to the source, and protective devices might not trip in

time.

58

What is Fault Loop Impedanc® (Zs)z
Fault | impedance refers to the total resistance of the fault = ‘red {0
Sree Ae ve conductor, through f rea!
path in an electrical system — from the active Con uctor, throug aes a
the load, down the protective earth path, and back to the supply — oa Aus a
transformer via the neutral. : art test prob sO
When a fault occurs (like an active touching a metallic casing), Zz 2.\nS os
the goal is for enough fault current to flow to trip the breaker Or = load aan \mo edanc m
blow the fuse within the required disconnection ume. lf the 3, select
impedance (resistance) In this loop is too high, the fault current ZS as “ZS’) caeetaes ne test
will be too low, and the protective device might not trip — leaving = 4.perform a “esulting yol
m dangerously live. measure
oe : ‘ cs 5 Record the reading and Ct
Na: Soar a a : ble 7s yalue for tne
This is why loop testing !S critical for safety and a requirement — | allowa cat f
under AS/NZS 3000, especially when commissioning new — ASINZS 3000 ta a i
installations OF verifying compliance after repairs. : 6.Repeat testing ot 0 |
cs circuit, sub-circult socke
Key Terms —
. Zs = Total fault loop impedance (measured at the outlet, ay What's a pass? Whats a
switchboard, or load). — . \FZs is too high, the fa
. Ze = External impedance (usually measured at the main cs level to trip the breake
switchboard — from supply to earth). ‘é . You'll need to investit
» R1 + R2 = Internal circuit impedance (active + earth | ames > Long cable runs:
| > Undersized cont

> Loose or corrod
o Bad earth path

’ td

---

## Photo IMG_1662

mpedan
aes C -
2edance Testin
e Testing ap impedance
How to Test Fault LO 2 eaten
A nctiO

ance ter OF muttifu
| to ee Tools needed: Loop impedance i
es resistance of the fault rated for the circult.

active conductor
> earth path, and b geacugh est

’ a . i : e

ad aie a ee oe required for setup- confirm i's safe tO u
{solate the circu!
active touching am
etallic casing) live. oint of
Ir a to flow to trip the breaker or > Insert test probes oF PIU the tester Int
red disconnection tim
e. If the load. arked
> 7 ° rs) r often m
; loop is too high, the fault current 3, Select "Loop Impedance mode on the teste (
as “Zs”").

mall current and

the tester injects aS
measures the resulting voltage drop to calculate ZS-

5 Record the reading and compare it against the maximum
allowable Zs value for the protective device used (see

ASINZS 3000 table 8.1 for reference).
6. Repeat testing on other points if needed (e.9..

circuit, sub-circuit socket).

tive device might not trip — leaving 4 Pert he test
Perform the test

‘al for safety and a requirement
/ when commissioning new
ance after repairs.

far end of ring

What’s a Pass? What’s a Fail?
. If Zs is too high, the fault current won't reach

level to trip the breaker fast enough.

. You'll need to investigate:
o Long cable runs (voltage drop)
> Undersized conductors

Loose or corroded terminations

nce (measured at the outlet,
the required

ually measured at the main

9 earth).
edance (active + earth

DDQQ2OGTG Rood aeeee

°

rip the breaker. :
_— o Bad earth path (especially in older ins
st doesn't just check numbers, i y talls)
ng system are intact. If the :
ee

d. the earth fault current may
tive devices might not trip in

---

## Photo IMG_1663

Example:

You're testing a final sub-circuit pro
MCB, The required disconnection ti
maximum permissible 2s for that bre

tected by a 20A Type C
me is 0.4 seconds, and the
AKETAS Lose,

The tester reads 1.80. That's too high.

 

Solution
. Check all terminations first. If the high loop impedance

reading persists, isolate the circuit and split it at the midpoint.
lf — this will help identify which

Test continuity on each ha
he high-resistance fault, you can cs

side of the circuit contains t
then hunt down to find which part of the circuit is giving the

 

DOMES?!

fault.
- Check the cable size reat

. Rethink circuit layout.
. Check the fault loop impedance at the main switchboard —

sometimes the issue lies with the incoming supply cable
itself, especially in older installations. ahaa

—

---

## Photo IMG_1664

Ne high loop impedance

Cuit and split it at the midpoint
this will help identify which
ugh-resistance fault, you can
ait of the circuit is giving the

at the main switchboard —
2 incoming supply cable
ons.

---

## Photo IMG_1665

all appliances ff

al tO unplug
simply curing *

  
 

ts essenti

      
  
   
   
   
   
  
 
 
 
  
  
 
 
  
  
 
  
  
  
  
 
 
 
 
 
 
 
 
 
 
 

  

— sos ine resting process =
sufficient, as many still allow so

3 ircult ba

s) are essential for electrical once unplugge g. tum each be
monitor the RCD response: if we ~

cially with @

energised (espe

rent Devices (RCD ;
ectedly or fail to
ty within that

Residual Cur
sometimes trip unexP cs
mmon causes of RCD | circuit is
| load path. —
c—s

but they can

operate correctly. Understanding the os : :

faults and how to diagnose ely {Ss crucial for eae etike
|, and industrial

electricians troubleshooting

systems.

safety
isolate these appliances f
asied time — ¢
suming the fau

Failing to
- misdiagnos's and W
the circuit before as

 
 
 
 
 
 
  

step-by-SteP RCD Fault Diagnosis

Visual Inspection
- Check for visible damage, moisture, or burns around the

RCD.
. inspect wiring f
. Look for signs 0
installations.

itself. ,
\f the RCD still fails to reset with €

disconnected, it may indicate a fe

or loose or damaged connections.
cables due to vermIn or incorrec’

¢ water ingress, especially in outdoor
Testing for Neutral-to-Earth F

. \solate power to circuit
. Disconnect the neutral wire
. Use an insulation resistan
and earth.
> A low resistance read
- Check for incorrect neutt

ated Issues

Checking for Load-Rel
d by the RCD and attempt to reset

Turn off all circuits protecte

the device with no loads connected.
If the RCD resets successfully in this unloaded state, the fault is

likely present on a downstream circuit or within a connected
appliance. Plugged-in appliances are one of the most common
sources of earth leakage, particularly those with internal heating
elements, moisture ingress, OF degraded insulation (e.g. kettles,

washing machines, OF fridges).

Measuring Earth Leakage

- Use aclamp meter (tha

measure total earth lea

- \f leakage is high, isole
individually.

« Check that leakage di

current (e.g., <OmMA ft

---

## Photo IMG_1666

Faults

S) are essential for electrical}
trip unexpectedly or fail to

jy the common causes of RCD
effectively iS Crucial for

>Stic, commercial, and industrial

sis
sture, Or burns around the

aged connections.
especially in outdoor

2CD and attempt to reset

unloaded state, the fault is
-or within a connected
one of the most common
hose with internal heating
sq insulation (e.g. kettles,

     

i's essential t0 unplug all ;

the testing process —
sufficient, aS many still allow

Once unplugged:

      
     
      
    
   

circuit is energise
issue is likely within th

      
 

ad to
all loads from

the RCD

   

solate these appliances properly can le
d time — always remove

ng the fault lies in wiring OF

   

Failing to |
misdiagnosis and waste
the circuit before assum!

       
    
   
    

t with all circuits and loads

itself.
if the RCD still fails to rese :
e a fault in the RCD itself, damaged

disconnected, it may indicat
cables due to vermin OF incorrect wiring at the board.

  
     
    
    
   
    
 
 

Testing for Neutral-to-Earth Faults

- Isolate power to circuit

. Disconnect the neutral wire from the RCD.
Use an insulation resistance tester (megger) betwe
and earth.

> Alow resistance reading indicates a fault.
Check for incorrect neutral wiring, especially in switchboards.

   
    
 

en neutral

       
   
   

    
   

Measuring Earth Leakage Current
- Use aclamp meter (that detects mA) in leakage made to
measure total earth leakage.
- If leakage is high, isolate circuits and test appliances
individually.
- Check that leakage does not exceed 30% of the RCD's rated
current (e€.g., <9mA for a 30mA RCD). :

     
    
   
   
     
  

Fit

---

## Photo IMG_1667

ter
ts to check response times.

e RCD with an RCD Tes
nd re-test.

1/2x, 1x, and 5x trip tes

Testing th
D fails to trip, replace ita

. Perform
If the RC

d on RCDs

faults to miss Is neutrals connected to the
wrong RCD. When this happens, the RCD sees an imbalance
(current going out on the phase but coming back on 4 different
neutral) and trips as soon as a load is connected.

Neutrals Swappe
One of the easiest

Key Takeaways
for neutral-to-earth faults before replacing an

J Always check

RCD.
J High earth leakage is a common

measure it properly.

J If an RCD fails a test, confirm correct wiring before as
is faulty.

J Water damage and worn insulation are frequent cul
outdoor and industrial setups.

cause of nuisance tripping—

suming it

prits in

 

RCD tripping to often

Nuisance tripping ON
circuits with motors

Delayed or slow tripping

No earth fault protectior

---

## Photo IMG_1668

) Tester
p tests to check response times.
ace it and re-test.

is neutrals connected to the

, the RCD sees an imbalance
3ut Coming back on a different
ad is connected.

th faults before replacing an
n cause of nuisance tripping—

yrrect wiring before assuming it

on are frequent culprits in

 
 
    
  
  

est to check

  
  

Use ramp test ™
trip sensitivity

   

RCD tripping too often

 
  
  

   
  

Measure leakage current
and check for harmonics

  
  

Nuisance tripping on
circuits with motors

   
    

 
 
 

 
 

3 be Check trip time at 1x and
Delayed or slow tripping eeratinge

   
  

Test RCD on multiple
outlets to confirm
disconnection

    

 
 

No earth fault protection

---

## Photo IMG_1669

circuit isn't delivering
matic approach
tep-by-steP gui

When a
following 4 syste
ue. Here's 4 Ss
ation:

isS
Power situ
s from the

s, gather key detail
identify the

Before starting the diagnos!
homeowner OF client. Their insights Can help you
e of the "No Po :

work, like installations or
appliances were added.

there were recent power

caus
- Recent Work: AS

repairs, Was rece

. Power Surges or
storms, OF local Oo

ntly done, Of if new
Outages: Check if

utages.
er loss Was gradual

  
 
 
      
 
  
 
  
   
    
   

surges,
- Circuit Interruptions: Find out if the pow
or sudden, and if it affected one area or the entire property. 8 ee
or outlets are not _— 4. Test the circutt Wiring:
| ~ Continuity Test

  

n continuity
the panel
ihe
on B

s: Ask which appliances

- Specific Appliance
pliances were being USE

working, or what ap
power tripped to help pinpoint the iSSUe.

d before the
c— multimeter |
outlet back tO

or open circuits in

inspect the Junctt

 
   

  

1. Ensure the Basics:
- Power Supply Check: Before you dive into the details, make =a °
coming into the system. Check the main 3 junction boxes, check
wires. Junctions are *

sure there is power
nfirm the circuit is supposed to have power’. lf
A such as corroded of

ce panel, it could affect multiple
. Once the live circuit

faulty cable togethe
end of the circuit at

supply to co
there's an issue at the servi

circuits.
« Circuit Breaker/RCBO: Ensure that the circuit breaker hasn't

: tripped. A tripped breaker could be the result of a short
circuit, overload, or a fault in the circuit. Reset the breaker to — cables. \f the circu’
u
somewhere along

see if the power returns.
Cc
supply end to loc

---

## Photo IMG_1670

on Circuits

 

wer, it can be frustrating, but by
, you can quickly pinpoint the
4e to help you diagnose a “No

ther key details from the

ts can help you identify the
ster:

rical work, like installations of
if new appliances were added.
eck if there were recent power
2S.

‘the power loss was gradual

> area or the entire property.
appliances or outlets are not
re being used before the

je issue.

1 dive into the details, make
he system, Check the main
posed to have power. If
el, it could affect multiple

t the circuit breaker hasnt
the result of a short
cuit. Reset the breaker to

DDD DOOM DDODDDaaD ADD

ed

>. check the
. Switch operation: ee * DOS
circuit is actually in the ch
toggle switch of 4 dimme! Oe
on the circuit.
3, Test the outlet: tthe yoltage at the
- Voltage testing: USe a muttimel® ding, it’s a strong
socket or outlet. \f youre getting N° aa it le
indicator that the problem |S somewnel upstrea ae
circuit. If you're getting a reading, but it's 1OW, this ©
indicate a partial fault (e.9. 4 \oose connection): : a
Loose Connections: Loose or faulty connections I ie one
can lead to no power Check for any burnt or loose wires
ecessaly.

4. Test
. Continuity Test: Isola

 
 

ches:
switche? gure that the sw

inside the outlet, and tighten as 1

the Circuit Wiring:
te the circuit being investigated. Using a

multimeter in continuity mode, check the wiring from the
outlet back to the panel. This will help you locate any breaks

or open circuits in the wiring.
- \f the wiring runs through

Inspect the junction Boxes.
junction boxes, check these areas for loose OF disconnected

wires. Junctions are common spots for issues to develop,
such as corroded or damaged connectors.

Once the live circuit has been isolated, twist the wires of the
faulty cable together at the supply end. Then, move to the far
end of the circuit and check for continuity between the
cables. If the circuit is Open, this indicates a damaged wire

somewhere along the line. Work your way back towards the

supply end to localise the fault.

---

## Photo IMG_1671

— Poe EPR IITA
~ a -~ ~ ~ ee
en eK Oy = aio. aia Be.
ae Te, — a Wt, oa. .. ~~, eases Ti ey S) ~~ ~~
7 i > “elt! > ts _ = oT. Oat
<e na, ste, a. a ~
a
Ss
ae ie
'. hci, oan li ee
“ — a uET rs
1, ssinnliaeineneliatmmcmmi ~ a OF THR
ne ,. ~, ~ men = a
- ee. ~ soa a %
-aitenda ee a
i ee ~~.
“i ee ma
mT ™ Pg Tae ei om =
= me ne
- 7
ie ~ = ~
~ ~ ~
S eee 0 si te
1m ee ey, » ~~ = oem CS ™~
on me mein fini,
wt), ang Pe Si es a
a tomy, Ny

&

a
. Onoe Me WE CPOER TKO

 

  

Pest tne Crculkt WHS: | aoe
D rect Raahane De CHCMR ORAS F resagaed. USSG
oe yen Bram The

= a “he Wa
spl MOAR, CHK He
ae Deeaks

rng & oN
a 5 : ~b iS
nygitet DRTK W Was PSM TANS Wal DAD VOR: WOR
“% i T “eae <> aS WEOQ
ome yMOVA BASS: F Ne WAG AVS PROP

al
ei “ PONS. CARA POSS BRAS DR WOOSS OF GRSOOES CRN
apes. EROS We OPA, SOUS bog BGUES WH GEVOEMP,
OGRE AF GRPAIGRS COW LES.

mas DEON SQA, ANGST WR WETS Ot Pre

oui

cody OSM TQS RYT Ae tre GUO, OA Then, MOve tC We
= of Pe GHC & nat CARSCK ROY COMER YK DEVO Fre

canes. fhe arcu 6 EPLe TUS PRACARWS A GPAQEAT WHS

ye oS Si ~ ye :
ma es ~ er %
Bi ~

i
= seat mst, Ty. yO DOS ma, 2. @
PN < A AN a = * cae Pa,
oe

< WA OOK WORE WY Rack ROR ss. ry *

---

## Photo IMG_1672

5. Check for Overload

6. Test the 6
.- Breaker Fault: A faul

7. Inspec

 

ed Circuits:
/RCBO is tripping: it could be due to an
Reduce the load on the circuit by

jances and resetting the breaker. if the
u may have identified the issue as an

if the circuit breaker
overload condition.
disconnecting appl
breaker stayS ON; yo
overloaded circuit.

ircuit Breaker/RCBO:
ty breaker may not

d. Test the breaker
| and checking if it's fun
breaker IS faulty, it

reset properly, even

by removing the
ctioning correctly

will need

if there is NO overloa
circuit from the pane
with an ohmmeter. If the
replacing.

t for Earth Faults:
protec

thas not tripped. R
balance between
ound fault.

a thorough check for any
re has

ted by an RCD (Residual Current
CDs are designed to
the active and

RCDs: If the circuit is
Device), ensure that i
cut power if there’s an im
neutral wires, typically due to a gf
Leakage Or Short Circuit: Perform
earth faults in the wiring. If the insulation on any Wi
broken down, it could cause leakage, tripping the RCD.

  
   
 
  
      
    
   
  
 
    
     
    
     
      
     
 
  
 
 
 
  
  
   
   
  
   
  
 
 
  

fray nt
here rodent . 103s ®
mmon © yse FP
mediately

. pevic

Test W th e. \
> now pprlian till
and connection an ner
working vice in s

of the provble ey
summary:

“NO Power situc
ed preakel ©
ving hrough

Diagnosing 4
issues like & tripPp

progressively mo
tests, such as continuity tests

connections. Always ensure
procedures while diagnosin
appropriate PPE and testin

---

## Photo IMG_1673

~

2 «

ripping, it could be due to
load on the circuit by =
esetting the breaker. lf the
> identified the issue as an

may not reset properly, even
preaeer by removing the

ing if it's functioning correctly
ris faulty, it will need

y an RCD (Residual Current
oped. RCDs are designed to
between the active and

‘ound fault.
a thorough check for any

ulation on any wire has
ge, tripping the RCD.

TODEOGNDD

PEER EOOOEODIDS

 
 
     
     

‘oj amage- : cn
g. Look for visible P - any visible signs of daM@" ces
e inspect the latio es ecially \ e.
urns, Fravind CO present wee
where rodents id be repail
common cause 9
immediately:
: ices:
9. Testi Kno Genk ek ve checked all the Winn
- Known working Appliance: i ou «ect :
and connections an still unsure: RE 5.22 ;
working device to the outlet. This wil rule ©
of the problem being with the device itsel
Summary: oe
» situation involves checking for simp

ga"“No Powel
d breaker OF an off switch, and then
ith more detailed

progressively moving through the system W!
tests and inspecting tor broken or loose

tests, such as continuity

connections. Always ensure that you are adhering to safety
procedures while diagnosing power iSSues, including using
appropriate PPE and testing equipment.

Diagnosin
issues like a trippe

---

## Photo IMG_1674

ae

 

    
    
       
    
 
      
  
  
 
  
  
  
  
   
 
 
  
  
 
  
   
  
 
   
 
  
 
 
   
 
  
 
  
 
 
  

cuit breake! trips, tS 4 sign that the system !S :
whet oe me fro a otentially dangerous eae é
igned to trip for several Key reasons. Visu ye anne
¢ the most common Use ney {on
. How to f\
solate yne tau

protecting yo
ers are
nd troublesho°

| condition:
Here's 4 guide t° identify 4
causes: a
1. overload Bae ms
. What happens: —

Too many appliances or devices drawing current on the , Aways recommend prote

same circuit. ce homed wners
, multiple devices (¢-9: f02SIet 3, Earth Fault (RCBO, Leaks

en

- What happens:

aks from an act

> Breaker trips after using

kettle, microwave):
he fridge outlet — this can be one that is often
a. iY

Current \e
(earth), often

*hrough a {é

o Also check t
forgotten as it is not easy to see.
> Breaker feels warm tO the touch. ~ . Signs:
. Howtodiagnose- aes , Breaker trips randor
> Unplug some devices. lie > Tripping when touck
nd test by turning appliances ON one by ~ conditions
a . How to diagnose:

>» Reset breaker 2
o Use an insulation

one.

. How to fix: pyar
>» Reduce load (move devices to different circuits). > Disconnect SUSPS
> If consistent, recommend installing a dedicated circult. aan . How to fix.

ay 1
2. short Circuit _ ; Beate
» What happens: ow
. Active (live) wire touches neutral wire Of another conductive en bee
material such as a metal casing OF something earthed, :
of current. ~~
erase

causing a huge Surge

---

## Photo IMG_1675

Tripping

  

. signs: a
, Breaker WPS imme
r

0 me
Burnt S on plugs o sockets.

lat the system is
> scorch mat

 
 
 
 
  
   
   
  
 
 
  
   
  
  
  
 
 
 
  
  
  

entially dangerous
or several kev re = o dia nose: 5
Sin mee OY reasons. Hon ate inspec outlets, switches,
oT Use | sulation resistance testing if needed
° se in
- How to fix:
olate the fault.
evices.

> Identify and is

> Repair damage

> Always recomme
homeownels.

place faulty d

d wiring or re
| repairs for

ing current on the |
nd professiona

3. Earth Fault (RCBO, Leakage to Earth)

« What happens:
. Current leaks from an ac

(earth), often through a faulty app
e Signs:

o Breaker trips randomly, sometimes without load increase.
e Tripping when touching appliances Of during wet

conditions.

- How to diagnose:
> Use an insulation resistance tester.

> Disconnect suspect appliances and retest.

- How to fix:
o Repair or replace faulty appliances Or wiring.
>. Recommend installation of RCD protection if not already

evices (€.g., toaster,
tive conductor to the ground

an be one that is often
liance or wiring.

apliances on one by

ant circuits).

dedicated circutl

present.

(Eee

---

## Photo IMG_1676

4. Nuisance Tripping

. What happens.
Breaker trips withou
breakers, loOSe connectio

e Signs:
> Breaker trips without heavy load.

o Happens intermittently.

. How to diagnose-
o Tighten all terminal connections.
o Test breaker itself (it could be weakened and need

replacing).
cs \

- How to fix:
o Replace faulty breaker if testing confirms.

> Correct any loose connections. = =

s first (€-9-. overloaded

cause — can be due to aging

ges.

 
 

t obvious
ns, or minor sur

  
 
 

s

  
      
     
 
  
  
  
    
 
 
  
 
 
  
  
  

   
  

   
 
 

 
  

Monitor circuit,
Pro Tips: test appliances
- Always C on circuit

circuits).
Remember to test under controlled conditions — always

| isolate power where necessary.
| . Educate the homeowne! where
i

heck the simplest cause

Y

Does

needed — many overloads

are due to user behaviour.

;

 

Inspect
appliant
alert ho!

---

## Photo IMG_1677

US Cause — can be due toa

: i
, OF Minor surges. mee

ivy load.

a
—
a
=
=
=
>ctions. —
_—
=
a
=

1 be weakened and need

2sting confirms.
ions.

ses first (e.g., overloaded
led conditions — always

1eeded — many overloads

 

 
 

Reset - Does the
breaker stay on?

 
  
  
 
 
 
 
 
  
 
  
  

    

   

Unplug all
appliances and
retest

  
 

Monitor circuit,
test appliances
on circuit

     
 

 

  
 
 

Check insulation
resistance and
continuity on
cable or faulty
circuit breaker

  
  
   

Inspect circuit
appliances and
alert homeowner

---

## Photo IMG_1678

Hot Water Cylinder Fa

storage type) at©
ically arise from
elemen

(electric

Issues tyP
jures, heating

Hot water cylinders
of household faults.
problems, thermostat fai
plumbing-related issues. Here’
common faults and how to diagnose them.

1. No Hot Water
- Possible Causes:
o Tripped circuit breaker.

o Faulty thermostat.
> Burnt-out heating element.
o Loose wiring connections.
« Diagnosis Steps.
» Check if the circu
necessary.

o Test voltage a
> Test the thermostat for continuity,

thermostat dial up and down whil
to assess if it is functioning correc

o Test the element resistance wit
14-20 ohms for a
3kW)

e FIX:
> Reset breaker or replace if faulty.

o Replace faulty thermostat.

it breaker is t

a comm
electrical
t faults, OF

s a step-by-step br

t the cylinder terminals.
try turning the

e testing the continuity
tly (isolate circuit first).
h a multimeter (typically

standard element rang!

  

ults

on source

eakdown of

ripped a= reset if

ng from 2kW to

o Replace heating element if open-circuit.

o Tighten or re-terminate wiring connections.

 
     
   

pare

Een

3. Circuit Breake

ei

 
   
    
        
     
      
   
      
 
       
    
      
    
    
   
   
 

o EX:

set around 60°C). )
5 esl thermostat operat

openiclose switching:

ust thermostat sett

a AGI
ostat tf

>» Replace therm

ror RCD
Possible Causes.
© Shorted heating ele
> Moisture ingress Ww
> Damaged wiring iv
Diagnosis Steps:
> (Insulation resista

earth.
o Inspect element

° FIX:
o Replace faulty '
o Repair/replace
o Seal or replaci

---

## Photo IMG_1679

tinder Faults

ge type) are a common source

ly arise from electrical
ting element faults, or

step-by-step breakdown of
e them.

tripped — reset if

ninals.

ty, try turning the

uile testing the continuity
ectly (isolate circuit first).
a multimeter (typically
ent ranging from 2kW to

ircuit.
ections.

Choa

2. Water Too Hot
« Possible Causes:
sion o Thermostat stuck in “ON
> Incorrect thermostat setting.
o Thermostat sensor detached from Cy
- Diagnosis Steps:
— © Inspect thermostat set temperature (ty

set around 60°C).

position.
linder.

pically should be

heating and monitoring

- o Test thermostat operation by
ie open/close switching.
—~ e Fix: :
e Adjust thermostat setting.
——— o Replace thermostat if stuck closed.
a

3. Circuit Breaker or RCD Tripping
« Possible Causes:
e Shorted heating element (internal short to earth).
o Moisture ingress into cylinder wiring or terminal block.
© Damaged wiring insulation.
« Diagnosis Steps:
o Insulation resistance test between active/neutral and
earth.
o Inspect element gland and wiring.
e Fix:
o Replace faulty element.
© Repair/replace damaged wiring.
© Seal or replace leaking glands or cylinder fittings.

---

## Photo IMG_1680

4. Water Leaking from the Cylinder

- Possible Causes:  eeing oF th th
. Hot Water Element is not tight, oF seal is missing ohm's Law: rt wit
damaged. V
>» Faulty pressure relief valve (PRV) discharg!ng constantly: = example (3.0 KW element at 230 )
© Loose pipework fittings. rz fe Current (Amps)

- Diagnosis Steps:
; : : 5
o Inspect cylinder for where leak occurs from, if water |S sail De power ee)
not leaking from element then contact a plumber. ? = Voltage (vo
R= Resistance (Ohms)

> Isolate and inspect element and check for leaks. ————

e Fix:
eee ee aes cyl ee and cnes — 1. Calculate the Amps from the W
for seal on element, replace seal if needed and retighten. <i \=pN= 000/230 ~ 43.04A
— 2. Now calculate the Resistance

5. Slow Heating / Insufficient Hot Water

- Possible Causes: R = Vil = 230/13.04 = 17.72

o Partially failed heating element (low output).
° Incorrect erosia setting: So a 3.0 kW element should v
> Sediment build-up covering element. Pe Y% for tolerance
« Diagnosis Steps: AoW oe
> Test element resistance (compare to rated value). = N tinuit
© Check thermostat setting. _ o continuity
© Consider age of cylinder and water hardness in the area. | if the element reads NO con
e FIX: aon determine the element Is bu!
o Replace faulty element. ra
© Adjust thermostat. High continuity
o Flush cylinder if heavily scaled (plumber usually needed). _ if the element reads higher
_ then the element is startin

slower.

---

## Photo IMG_1681

nder
tight, or seal is missing or

e (PRV) discharging constantly.

leak occurs from, if water is
len contact a plumber.
t and check for leaks.

| cylinder, unscrew and check
seal if needed and retighten.

Nater

nt (low output).
ement.

are to rated value).

ater hardness in the area.

umber usually needed).

ae
a
2

ores

How to calculate an expected element resistance

n range, you can use
n the nameplate.

   

To check if a hot water element Is withi
Ohm’s Law. Start with the power rating 0

   
   
   

Example (3.0 kW element at 230 V):
| = Current (Amps)

P = Power (Watts)

V = Voltage (Volts)

R = Resistance (Ohms)

    
  
 

1. Calculate the Amps from the Watts.
| = P/V = 3000/230 = 13.04A

2. Now calculate the Resistance.
R = V/| = 230/13.04 = 17.79

So a 3.0 kW element should measure around 17-18 Q cold.
Allow +10% for tolerance.

No continuity

if the element rea
determine the element is burnt out or broken.

ds no continuity on your meter — this would

 

High continuity
if the element reads
then the element is starting to fail,

slower.

higher than the expected range of continuity
it may still heat but much

---

## Photo IMG_1682

iycult Breakers or RCDS
eatedly

— 4. Tripping Cc
= Symptoms: Breaket or RCD rep
Potential Causes-
ate ° Overloaded circuit due tO added equi
= o Nuisance tripping from cumulative ec
© Faulty appliances or damaged cabl
4 8 ° Neutral-to-earth faults OF short circu
ace ~ Rectification Steps:
ey > \dentify what's connected to the Cit
one by one.
— , Use a clamp meter tO check currs
a breaker rating.
adie > Perform insulation resistance te!
cable or appliance.

> Check neutral-earth paths for t

---

## Photo IMG_1683

alts
Se:

ane

 

 
 

ipution systems ID

Power Distr 2Y=
Commercial Buildings

      
    
    

= Z Overview istripution
A a Commercial buildings often have complex Pome boards, and
: istripution ;
ss systems involving multiple d its. These systems are

d three-phase circ
d variable loa
d office equipmen

both single-phase an

’ HVAC
- designed to handle high an ds such as

+. A fault in the

2MMERCIAL FAULTS elie systems, elevators, lighting, an “= cones
—— distribution system can affect large areas and critical services, >=
efficient fault-finding Is essential.
= Common Faults in Power Distribution Systems
P 1. Tripping Circuit Breakers or RCDs
- Symptoms: Breaker or RCD repeatedly trips under load.

a - Potential Causes:
— > Overloaded circuit due to added equipment.

o Nuisance tripping from cumulative earth leakage.
© Faulty appliances or damaged cabling downstream.

  

— > Neutral-to-earth faults or short circuits.

oe - Rectification Steps: &

ah o Identify what's connected to the circuit. Unplug devices . x
one by one.

Use a clamp meter to check current draw—compare to

ns breaker rating.
Perform insulation resistance testing to locate damaged

a cable or appliance.
Check neutral-earth paths for bonding or wiring issues.

---

## Photo IMG_1684

ance

2. Phase jmbal a
Equipment running !

e symptoms:

i humming in panels.

| Potential Causes:

> Uneven loading across P
boards.

> Single-phase |

> Faulty equipment
phase.

. Rectification Steps:
> Use clamp meter on each phase to measure current

draw — take this measurement when the most power is
being used during a day.
> Re-balance loads where possible by relocating circuits.
o Inspect load schedule and adjust circuit allocations

accordingly.

nefficiently, breakers warm,

  

oads not balanced.
drawing excessive current from one

 
 

3. Voltage Drop or Fluctuation
- Symptoms: Lights dimming, motors stalling, equipment
resets.
- Potential Causes:
> Undersized cables for load distance.
o Loose terminations or corroded connections.
o Faulty main switchgear or incoming supply issues.

- Rectification Steps:

o Measure voltage at source and end of the line under

load.
© Tighten or replace loose/burned connections.

> Check supply authority's connection and service fuse

integrity.
> Consider upsizing cables if voltage drop ex

limits.

  
   
    
    
      
 
 
    
    
 
   
    
 
 
 

hases, especially in three-phase

ceeds allowed

  

A. Neutral Faults

oms: Appliances damaged, lights ©

 
 

- Sympt
dim, erratic behaviour.
Potential Causes:
—" o Open or floating neutral on the distribu’
——= >» Loose OF broken neutral link at the boe

> Neutral conductor

. Rectification Steps:
> test for voltage between

le

active and neutral at

 
  
    
      
    
   

points. °
> Check continuity of neutral from source t0

> Inspect switchboards for loose termination

heat.
> Always isolate before tightening OF replacing mt

links.

    
  
  
 
  
   
  
 
  
  
  
  
  
 
  
  
   

 

5. Switchboard Faults
- Symptoms: No power to circuits, breakers not res

buzzing sounds.

- Potential Causes:
o Loose connections at main busbars or brea

¢ Mechanical failure of circuit breakers.
o Arcing or water ingress into the board.

« Rectification Steps:
© Visually inspect for burn marks, corrosion.

water entry.
o Test suspect breakers for mechanical or |
o Tighten all terminal screws to torque spe
o \f corrosion or water is found, board ma\
replacement or rebuild.

---

## Photo IMG_1685

er oo
nning inefficiently, breakers warm

  

-
Oss phases, especially in three-phase

; not balanced.
rawing excessive current from one

each phase to measure current
asurement when the most power is
day.

ere possible by relocating circuits.
e and adjust circuit allocations

ion
g, motors stalling, equipment

load distance.
corroded connections.
r or incoming supply issues.

irce and end of the line under

>/burned connections.
> connection and service fuse

- if voltage drop exceeds allowed

COOGEE DODDTT Pe

 

4. Neutral Faults |
. Symptoms: Appliances damaged, NG {8 0\
dim, erratic behaviour.

- Potential Causes: ae
neutral on {he distriputio

o Open or floating
> Loose or broken neutral link at the boar
r corrode

o Neutral conductor damaged oO!
- Rectification Steps:
Test for voltage between active an

points.
Check continuity of neutral from source

Inspect switchboards for loose terminations

d neutré

°

heat.
Always isolate before tightening or rep

links.

lacing neut

5. Switchboard Faults
- Symptoms: No power to circuits,
buzzing sounds.

- Potential Causes:
> Loose connections at main busb

© Mechanical failure of circuit breakers.
o Arcing or water ingress into the board.
« Rectification Steps.

> Visually inspect for bur
water entry.

© Test suspect breakers

o Tighten all terminal sc

> {If corrosion or water is foun
replacement OF rebuild.

breakers not resetting,

ars or breakers.

n marks, corrosion, and signs of

for mechanical or thermal failure.

rews to torque spec.
d, board may need

---

## Photo IMG_1686

Tools Recommended
. Insulation resistance tester

- Clamp meter

. Multimeter (true RMS preferred)

. Thermal imaging camera (for hotspots)

« Torque screwdriver (for tightening terminations)
- Voltage drop calculator (or app)

     
     
 
  
 
 
 
   
  
 
  

Pro Tip:

In commercial setups, faults often originate from poor
documentation or past modifications. Always look for dodgy
additions, undersized cables, or unknown circuits. Before diving

deep, ask: “Has anyone changed anything recently?”

i Se

pooedet odode

|

a
al
A
a
a

 
 
   
 

overview
HVAC (Heating,
commercial enviro
24V AC), sensors, relays, COM
phase motors for compressors |
long this chain—from a

anywhere 2
failed three-phase condenset fan. ©
ritical for fa

logic and signal flow isc

~

Common HVAC Fault Areas

1. Thermostats & Temperature :
Symptoms:
- Room not reaching set tempe
« HVAC not turning on OF oft
. Inaccurate temperature read
Potential Causes:
- Faulty thermistor or RTD set
- Broken wires or poor termin
« Incorrectly placed sensor (it
Rectification:
1.Measure resistance of the |
common thermistors).
2.Compare to manufacturer’
3.Check wiring continuity be
4.Relocate sensor if enviror
readings.

---

## Photo IMG_1687

HVAC systems: Diag

fn

       
   
   

 
    

red)

  
  
 
 
    
 

Overview ee er
: popes) HVAC (Heating, Ventilation and Air Conditioning) me
SD aon) = commercial environments integrate low-voltage con : sare
at) , 24V AC), sensors, relays, contactors, and high-voltage © ==

 
   
 

phase motors for compressors and fans. Faults can occur a
anywhere along this chain—from a faulty thermostat sche
failed three-phase condenser fan. Understanding the control
logic and signal flow is critical for fast, effective troubleshootin

  
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
  

nN originate from poor
ons. Always look for dodgy
inknown circuits. Before diving

anything recently?" Common HVAC Fault Areas & Fault-Finding Steps

4. Thermostats & Temperature Sensors
Symptoms:
- Room not reaching set temperature
« HVAC not turning on or off
- Inaccurate temperature readings
Potential Causes:
« Faulty thermistor or RTD sensor
- Broken wires or poor terminations
- Incorrectly placed sensor (in draft or sun)
Rectification:
1. Measure resistance of the probe (e.g., 10kQ at 25°C for
common thermistors).
2.Compare to manufacturer's resistance chart.
3. Check wiring continuity back to the controller.
A Relocate sensor if environmental placement is skewing

readings.

“uuDnDoooAaTTIILIIIIH

---

## Photo IMG_1688

2. 24V AC Control Circuit (Low-Voltage Controls)
Symptoms:
- No response from unit
- Relays or contactors not pulling in
- Thermostat seems dead
Potential Causes:
¢ Blown control fuse
¢ Open control transformer secondary
- Broken control wire (commonly on roof runs)

- Faulty relay or shorted coil
Rectification:

- Check for 24V AC between R and C terminals at thermostat
or control board.

¢ Test control fuse continuity.

- Inspect transformer—confirm primary and secondary
voltages.

- Check resistance across relay coils—replace if open.
- Look for shorts between 24V wires and earth.

3. Contactors & Relays
Symptoms:

e Indoor or outdoor fans not starting
e Compressor doesn’t run

e Loud buzzing from contactor
Potential Causes:

¢ Coil not energising
e Burnt contacts

¢ Mechanical failure (sticking or chattering)
Rectification:

« Confirm coil voltage is present (24V or 230V, depending on
design).

« Manually press contactor—check if load operates.
« Inspect contacts for pitting or carbon buildup.
¢ Replace faulty contactor or relay.

84

   

    

}

— Bs

—
—s
—s
—s
os
=a
—s
—— |
—s
——s
=
c—s
=

A. condense! & Eva
Symptoms:
° Overheating
. No airflow |
Fan hums but doesnt Sp!

Potential Causes:

    

Seized bearings 7

. Failed starvrun capacito
- Open windings

. Phase loss on 3-phase
. Blocked fan grille filter

Rectification:

- Spin fan blade manua
. Test capacitor with ca
. Test windings for con
- On 3-phase fans, tes

for imbalance or loss
- Replace motor or Ca
- Clean out the filter

5. Compressors (Scrc
Symptoms:

- No cooling

¢ Tripping breaker

« Compressor start:
Potential Causes:

« Open windings o

¢« High head press

¢ Start/run capacit

« Phase reversal

« Locked rotor

---

## Photo IMG_1689

OW-Voltage Controls) g Evaporator Fan Motors
4. Condenser
Symptoms:

e Overheating
¢ No airflow
. Fan hums but doesn't spin
Potential Causes:
- Seized bearings
- Failed start/run capacitor
e Open windings
- Phase loss on 3-phase fans
e Blocked fan grille filter
Rectification:
¢ Spin fan blade manually—should rotate freely.
- Test capacitor with capacitance meter.
- Test windings for continuity and insulation resistance.
- On 3-phase fans, test voltage between each phase—check

for imbalance or loss.
- Replace motor or capacitor as required.
¢ Clean out the filter

      
 

ulling in

    
   
   
 

=condary
nly On roof runs)

 
   
      
        

% and C terminals at thermostat

    
 
 
 

 
   

primary and secondary

 
   
 

-coils—replace if open.
/ires and earth.

    
   
 

5. Compressors (Scroll or Reciprocating, 3-Phase)
Symptoms:
¢ No cooling :
e Tripping breaker
« Compressor starts then shuts off
Potential Causes:
¢ Open windings or internal overload
High head pressure (blocked condenser)
Start/run capacitor fault (if single phase) Pin,
Phase reversal ce *
Locked rotor

   

ng

 
   
 

ttering)

=
/ or 230V, depending on a

load operates.
) buildup.

3

---

## Photo IMG_1690

etween terminals (C-R-S) and check

« Measure resistance b
rts to earth.

for open circuit or sho
- Test phase rotation using & phase

- Ensure correct voltage Is supplied
s and high-pressur

sequence meter.

to all three phases.

| Rectification:
}

| -out for
. - Check pressure switche e cut-out

resets.
. If windings test OK but com

mechanical failure (replace unit).

pressor won't startpossible

6. Pressure Switches and Safety Devices

Symptoms.

« Unit locked out

- No compressor activity despite goo
Potential Causes:

~ Low or high refrigerant pressure

« Faulty switch

e Tripped manual reset

- Refrigerant gas leak

Rectification:
- Check refrigerant pressures (requires HVAC license).

d control signal

. Reset if it's a manual switch and safe to do so.
- Investigate cause of trip—blocked airflow, low charge, etc.

7. Control Boards & Fault Codes
Symptoms:
» LED flashing codes
- Random shut-downs
- No response to commands
Potential Causes:
- Control board failure
« Sensor feedback error
- Software lockout due to repeated trips
86

» Confirm switch continuity—test between COM and NC/NO.

 

Rectificatlo poard—t

—s .
——— | . Read fault code from
— art.
— | d for dry joints ©
if diagnostics
—r

pro Tip:

if the COMP
switches, an
unit. Start at

voltage gear.

ressor S not rUnNINe
d phase rotation fi
the control side ¢

Real-world Fault Exal’
Working

Scenario:

After a heavy storm, a foo
indoor thermostat appeal
outdoor unit Was complet

no sound.

=e
-
=r
——s
——e
a
wi
| Initial Checks:

:
ai sy

Power to the building W:
= am feeding the HVAC syst
her the outdoor unit.

Testing:
= Checked for 24V AC &
sabe This indicated the cot

---

## Photo IMG_1691

Rectification:

=n terminals (C-R-S) and check

earth. . Read fault code roy nce

phase sequence meter. chart. m and monitor for reocci nts
. Power-cycle syst r swollen compone i

Ipplied to all three phases =—— 0

, ZZ. ioints or SW

1d high-pressure cut-out for - Inspect boa cule confirm failure:
i

—— - Replace boa!
oressor won't start—possible oe ssure
init). ip: |
) = CS eee not running, alwayS check ee d oa “
ty Devices = switches, and phase rotation first before aS do hate
ale unit. Start at the control side and work your Way
voltage gear.
‘e good control signal ——
= Real-World Fault Example -Rooftop HVAC Not
= ali Working
—— Scenario:
wo After a heavy storm, a rooftop HVAC unit stopped working. The
indoor thermostat appeared normal and responsive, but the
quires HVAC license). S=3 outdoor unit was completely inactive — no fan, no compressor
between COM and NC/NO. e—_ 0 sound.
| safe to do so. | Initial Checks: x

Power to the building was confirmed, and the main isolator
feeding the HVAC system was on. No visible signs of damage at
the outdoor unit.
Testing:
Checked for 24V AC at the control board — nothing present
This indicated the control circuit wasn't being powered. 3

d airflow, low charge, etc.

---

## Photo IMG_1692

Diagnosis:
Upon inspection,
found blown. Further testing rev

running to the outdoor coil, likely due to stor
ge. Additionally, the rel

ingress or physical dama
showed signs Of thermal damage: possibly caus
circuit or voltage spikes during the storm.
Fix:
- Replaced the damaged control wiring.
- Installed a new control fuse.
« Replaced the burnt-out contactor.
Outcome:
Once power was restored, the sy
operation. Cooling returned, and

correctly.

d was
the low-voltage control fuse on the boat Sens
ealed a short in the contro

m-related water
ay contactor coil
ed by the short

stem resumed normal
the thermostat responded

Key Lesson:
Always verify low-voltage control power when a unit appears

dead. A blown control fuse often points to a shorted external
device or wire, and storms frequently cause this type of fault due
to water, debris, or voltage surges.

oan os
- Y
agers

Gi ay

emergency +1

overview

emergency fighting systems are ¢

during power outages: providing
s must remain fun

These systems Il" |
lighting circuits fail. In commer!
emergency lighting often go UM

a real emergency — exposes t

Emergency lighting typical)
Batteries OF central batter
- Inverter circuits.
. Test switches.
- Exit signs and emergent

- Integration with normal |
monitoring.

Common Emergency Lig
Battery Failures

- Symptoms: Emergent
or self-test.

» Causes: Old or degré

simply the battery he

- Fix: Replace battery

battery is connecte¢

 

sa Lamp or LED Failure

« Symptoms: The u
¢« Causes: LED driv

& oer - Fix: Replace faile

terminals.

---

## Photo IMG_1693

se On the board was
rt in the control wiring
m-related water

> relay contactor coil
‘aused by the short

-d normal
at responded

1 unit appears
rted external
type of fault due

J
—
—
— « Causes: LED driver failure, blown lamp, heat damage.
cc
[name
Cc

   

nting Faults

Overview bs t safety
Emergency lighting systems are critical of eee evacuation.
during power outages, providing illumination nen normal

These systems must remain functional even W : an
lighting circuits fail. In commercial environments, a fi
emergency lighting often go unnoticed until routine testing

a real emergency — exposes them.

 

Emergency Lig

   
     
        
            
     
   
   
 
 
 
 
  
 
  
  
  
 
 
  
 
 
 
   

oa ls aay
—-- Emergency lighting typically includes:
pan » Batteries or central battery systems.

« Inverter circuits.
a « Test switches.
» Exit signs and emergency light fittings.
» Integration with normal lighting circuits for charging and

lle) ‘ »
monitoring.

it

i aye
Common Emergency Lighting Faults
"= Battery Failures
shed - Symptoms: Emergency light does not stay on during outage
seal or self-test.

« Causes: Old or degraded batteries, failed charging circuit, or
simply the battery has not been connected.

« Fix: Replace battery packs, test charging output, ensure
battery is connected.

Lamp or LED Failure

« Symptoms: The unit powers on but provides no illumination.

- Fix: Replace failed components; test voltage at lamp
terminals.

---

## Photo IMG_1694

Charger Circuit Faults . arr ove! charging: xs
. symptoms: Battery not holding charg - ansformet
; - Causes. Failed capacitors, burnt PCB tracks, —s secription
a cat iceable —s Ea eS sch dule 90 minute ©
. Fix: Repair PCB OF replace fitting if not servic —— | pune cial office plock, ™
; ne floor faile
Test Button oF Key. Switch Not Working os signs across O : entirely. Atfac
- Symptoms: Light won't activate in test moog. , others stayed - ty dit
. Causes: Faulty switch, broken test circult wiring, contro er c—sa urgent in cpection be
fault.
- Fix: Test continuity across switch, trace wiring path, coniirm ctep-by-SteP Walkthrougn Us
correct control input voltage. = 4. initial assessment
oat es i spoke with the building mal
Loose OF Missing Neutral in Common Circuit d:
meget are : entioney-
. Symptoms: Some lights fail to charge or don't function during cs They ™
test. |
ocks, shared “Ne had LED downlights re
“The fault only affects one

 
  
   
  
   
  
 
 
 
   
  
  
  
  
 
 
 
 
 

. Causes: Poor connections at terminal bl

neutrals disconnected.
. Fix: Inspect terminations |
continuity between active and neutral.

n DBs and junction boxes; test

meat a

Exit Signs Not Illuminating
~~ . Symptoms: Sign is dar
f | . Causes: Power supply issue, P
wiring during renovations.

Fix: Confirm voltage supply; t
driver circuitry.

k during test or normal operation.
CB or LED failure, incorrect

est internal battery; inspect

the rest.”

This pointed to a \localise
recent lighting installatio

2. Safety Checks
. Verified power sole
board (DB).
Used LOTO proc
shared supplies.

es Ctiwj.

ie 3. Diagram Analysi:

oe - No updated as-t

aaa the DB indicate!
key switch.

— » Traced affecte

verified test ke

---

## Photo IMG_1695

ge or overcharging.
‘B tracks, transformer

jot serviceable.

t mode.
Cuit wiring, controller

€ wiring path, confirm
Jit

1 don’t function during
locks, shared

ction boxes; test

mal operation.
. failure, incorrect

attery; inspect

ca

ce |

a

les

DOQDDNDDIDUE

3. Diagram Analysis

Em ergency Lights Failing :

 

Real-world Examp
Routine Test

   
  
 
  
  
   
 
 
 
 
  
  

Fault Description:

During a scheduled 90-minute eme
in a commercial office block, multip
signs across one floor failed to illuminate. Some
others stayed off entirely. A facilities manage! req

urgent inspection before audit day.

rgency lighting discharge
le emergency lights an
lit dimly, WO!
uested an —

=o

Step-by-Step Walkthrough Using the Eault-Finding Process.

1. Initial Assessment
| spoke with the building ma
They mentioned:

nager and reviewed the site log.

“We had LED downlights replaced recently in the same zone.”
“The fault only affects one area — the rest of the building passed

the test.”

This pointed to a localised fault, possibly introduced during
recent lighting installations.

2. Safety Checks
- Verified power isolation before opening the floor’s distribution

board (DB).
« Used LOTO procedures and checked for backfeed or

shared supplies.

- No updated as-builts (drawings) available, but label IDs on
the DB indicated multiple circuits tied into an emergency test
key switch.

» Traced affected circuits physically using core numbers and

verified test key input back ip emergency fittings.

---

## Photo IMG_1696

esent.
cuits snowed 230V Pr
g circul gesting an

4. Testing
high (~110V): sug

. Voltage test on live fightin
° Neutral-to-earth voltage Was
I,
open or floating neutra , oe
. Continuity test on neutral confirmed an open
the DB and emergency light group.

cuit between

cS
DB was loose only partially clamped. | pt
g was installed. co 1 N
he emergency light
g discharge-

5. Diagnosis

- Aneutral link i
Likely dislodge
This caused incomplet
circuit and unstable per

n the
d when new lightin
e charging on t
formance durin

6. Repair
e board and re-terminated the neutral link

- Fully isolated th
using proper torque settings.

Retested continuity and voltage — confirmed solid
c—s
——
F==3
c—s
Z=—s

connections.

7. Final Check
- Performed a 30-minute emergency lighting test — all fittings

now illuminated and discharged correctly.
the fix, and recommended a fe-

informed client of the Cause,

test before audit day.
. Logged repair in maintenance schedule and added a note om |
about as-built documentation being outdated.
A

Key_Lesson:
Never assume lights
verified. A loose neutral
— can cause scattered fault

are really just poor terminations.

 

are faulty until the circuit's integrity Is
_ especially on shared control circuits ——
s that look like equipment failure but

---

## Photo IMG_1697

4itS Showed 230 present.
IM (~110V), Suggesting an

ned an open circuit between
ip.

'—— Only partially clamped.
9 Was installed.

on the emergency light
luring discharge.

unated the neutral link

confirmed solid

yhting test — all fittings
ctly.
ind recommended a re-

le and added a note
‘dated.

jit’s integrity is ,
red control circuits
quipment failure but

---

## Photo IMG_1698

d Faults

Motor Control Circuits an WS

industrial settings can range from basic
rters to advanced VSD (Variable Spe
Drive) and P_c-controlled systems. These circuits handle hig
loads and operate in harsh conditions, SO faults are not
uncommon. Effective fault-finding requires 4 methodical
approach: control side first, then load side.

Overview
Motor control circuits in
direct-on-line (DOL) sta

Common Motor Control Circuit Faults

1. Motor Won't Start

Symptoms:
« No movement or sound from the motor.

e Control buttons (Start/Stop) seem unresponsive.
- Nocontactor activity.

Potential Causes:
- Blown control fuse.
e Open stop button or safety interlock.

- Failed start button.

- Coil voltage not reaching contactor.
Rectification Steps:

1. Verify incoming supply is present
2 Test start/stop circuit for continuity and correct

3 Measure voltage at contactor coil—should mat

voltage rating.
A Check overload relay for trip conditio

5. Inspect safety circuits (

(control and main).
sequence.

ch control

n—reset if needed.

e.g., E-stops, guards) for breaks.

. control volta’

n steps:

Rectificatio
i\ volta:

. Measure co
rated value.

.- confirm correc
- Replace worn Of stuck conte

» Check wire SIZe and connec

. \solate supply and use COM
build up, ensure contact |S

ge under 0

t coil type Is ¥

3. Motor Trips Immediately ‘

Symptoms:
- Breaker OF overload trips

- Motor hums but doesn't

 

A . Excessive inrush curren

— Potential Causes:

_— . Locked rotor or seized
os! . Incorrect phase rotatio
_ - Shorted windings.

oo - Undersized protectior
© Ra
Pro Tip:
re Always check off the ba:
mos overlooked could be the

something small, but cé

---

## Photo IMG_1699

Circuits and Faults

 

strial settings can range from basic
to advanced VSD (Variable Speed
stems. These circuits handle high
nditions, so faults are not

ding requires a methodical

en load side.

rol Circuit Faults

n the motor.
seem unresponsive.

‘erlock.
actor.

nt (control and main).
jity and correct sequence.
si—should match control

dition—reselt if needed.

pS, guards) for breaks.

 
  

someth

 

usual noise

 

2. Contactor Buzzing or making Un

Symptoms.
. Loud buzzing from panel.
- Contactor wont latch.
. Motor stutters or cycles on/off.
Potential Causes.
- Low coil voltage (wea
« AC coilon DC circuit (0
» Mechanical binding in the con
- Control voltage drop during ener
Rectification Steps:
. Measure coil voltage under load—should be within £107
rated value.

e Confirm correc
- Replace worn or stuck contactors.
Check wire size and connections for voltage drop issues.

isolate supply and use contact cleaner to remove carbon
build up, ensure contact is dry before energising.

 
   

k supply or long run).

r vice versa).
tactor (stuck).

gisation.

t coil type Is installed (AC VS. DC).

3. Motor Trips immediately on Start
Symptoms:

. Breaker or overload trips.

~ Motor hums but doesn't turn.

. Excessive inrush current.

Potential Causes:
. Locked rotor or seized bearings.
. Incorrect phase rotation.
« Shorted windings.

Undersized protection settings.

Pro Tip:

Always check off the b

overlooked could be the faul

ing small, but can escalate int
95

asics first, something that might seem
t. Motor faults often begin with
o full panel failures.

---

## Photo IMG_1700

Rectification Steps: ‘ BI '
- Try rotating shaft manually—shou : 4 no
: ance test (Megge!) 1° Oo
- Perform insulation resistanc S
shorts. ly sized - Rectifical® ef \n0se
. Check breaker and overload settings—ensure properly _ , rest UE ea gor 100
for motor cables and current. : . inspec at tne cor
- Use clamp meter during startup to observe inrust!- rs check \ding ©
or
- Check supply for all three phases—phase loss —— when en rgise nsform t ant
imbalance? confi rm c ntrol a
wee
i fter a While Tri inc
4. Motor Runs But Overload Trips A —— : overload Relay False pp
Symptoms:
. Motor starts normally, then trips after a few minutes. —— Symptoms: ao apparent cau
. Overload reset required. ' - Tripping aqht 1oad
- Motor hot to touch. —— . Happens under a
Potential Causes: . aris inconsisten y.
» Overloaded mechanical load. Potential Causes:
. Fan cooling system blocked or failed. > . Ambient temperature affect!
i a . Loose motor terminals caus

incorrect overload setting or Curve.
gle-phasing.

- Voltage imbalance OF sin
Rectification Steps:

- Compare actual current
overload setting.
Inspect load mechanically (e.
- Test phase-to-phase voltage
. Use thermal camera to detect hot spots.

- Clean motor vents and check external fan function.

draw to motor nameplate and

g., jammed pump OF conveyor).
for imbalance (>2% is an issue).

5. Start/Stop Buttons Not Working Properly
Symptoms.
. Motor won't respond t
» Only works when holdin
Intermittent operation.

o button presses.
g button down.

‘= om

 
     
   
   
   
 

- Wrong type of overload (oo

Rectification Steps:
- Replace thermal with elec

e Tighten all terminal SCTeW
Compare overload type t
fan).

. Consider external ambi

Tools Recommended:

- Multimeter (for voltage
~ Clamp meter (to chect
- \nsulation resistance t

- Torque screwdriver (f
+ Control circuit scherm

---

## Photo IMG_1701

-—should move freely.
ce test (Meager) to check for

id settings—ensure properly sized
IL.

wtup to observe inrush.
hases—aphase loss or

rips After a While

ips after a few minutes.

r failed.
ive.
lasing.

) motor nameplate and

jammed pump oF conveyor).
imbalance (>2% Is an issue).

it spots.
ernal fan function.

Properly

SsSes.
pwn.

Potential Causes:

 

. Faulty or sticky pushbutton.

. Loose wiring.
- Control circuit
Rectification Steps-
. Test button operation with continuity tester. on
. Inspect terminal blocks for loose OF corroded wee 2)
. Check holding contact in the contactot circuit
when energised.
- Confirm contro! transformer

      
  
 

and fusing are intact.

6. Overload Relay Ealse Tripping
Symptoms:
» Tripping with
- Happens under light load.
e Trips inconsistently.

Potential Causes:
Ambient temperature affecting thermal type overload.

Loose motor terminals causing high resistance heating.
Type B instead of Type D).

no apparent cause.

- Wrong type of overload (€.9:,
Rectification Steps.

- Replace thermal with el

- Tighten all terminal scre

e Compare overload type to ap

 

ectronic overload for better accuracy.

ws with torque driver. | |
plication (€.9.. conveyor VS. ‘
¥

fan).
. Consider external ambient compensation if panel gets hot.

Tools Recommended:
. Multimeter (for voltage and continuity checks).

~ Clamp meter (to check motor current draw).

. Insulation resistance tester (for winding checks).
Torque screwdriver (for terminal checks).
Control circuit schematic (if available).

e

---

## Photo IMG_1702

4 pLc System

control Panels an
tectrical and

panel? i
| panel is an enclosure housing ae
ed to control machinery; processe>:
It typically includes:

(breakers, isolators)

VSDs)

What is a Control
An industrial contro
electronic components US
and safety systems in a plant.
Power distribution equipment
Motor starters (DOL, star-delta,
Control relays, timers, an
Programmable Logic Con
Safety devices (E-stops, safety re
Terminal strips and labelled wiring f
d safety, often with int
rol VS

trollers (PLCs)
lays, interlo
or field connections

ernal

nels are built for reliability an

These pa
oltages (€.9:; 24VDC cont

segregation for different V
415VAC power).

What is a PLC?

A Programmable Logic Cont
used to automate and contro
inputs, executes programmed

PLC) is an industrial compute!

roller (
t monitors

| machines or processes. \
logic, and switches outputs

accordingly.
Think of it as the brain of the system—reading sensors and

sending commands to actuators.

PLC Inputs and Outputs (I/O)

Inputs:
Inputs tell the PLC what

be:
» Digital Inputs (DI): ON/OFF signals

o Examples:
» E-stop pressed (signal OFF
. Limit switch triggered

» Start/Stop button pressed
98

s happening in the real world. These can

= tripped)

   

 

a

d contactors
=

cks)
Tl

tt onl

=

~~

You'll typically find:
oo

at tO dt

Outputs- wh

_—— : devices :

outputs to mele . activate
- bigita

   

Outputs
. Examples:
motor Via cont

 
   
 
   
  
 

. Analog Outputs

 

> Examples:
" adiust VSD specs

. Control valve pos

s and interlock
is a fail-safe fe
-stops, gual

Safety Relay
A safety relay
functions (like cE

executed.

Key points:
- Monitors circuits like e

. Provides dual-channe

failures.
- Must be reset Manuva

- interrupts power to Cc
hydraulics).

- Dedicated safety ci
« LED indicators she

---

## Photo IMG_1703

‘and PLC Systems

in enclosure housing electrical and
) control machinery, processes,

It typically includes:

ant (breakers, isolators)

elta, VSDs)

contactors

allers (PLCs)

fety relays, interlocks)

wiring for field connections

lity and safety, often with internal
; (e.g., 24VDC control vs

(PLC) is an industrial computer
hines or processes. It monitors
> and switches outputs

n—reading sensors and

in the real world. These can

Is

F = tripped)

——
i,
oe
ome ome

CEDDQOODL

 

ble signals

       
  
   
  
     
 
 
 
  
 

. Analog Inputs (Al): Varia .
> Examples: 1-20mA
. Temperature probe (9-10V of
» Pressure sensor
. Flow mete! sae 6
The input terminals are usually ave and 9 (Ce
on the PLC.
Outputs: 7
d devices what to do. These can be: :

Outputs tell fiel
- Digital Outputs or deactivat
o Examples:

= Start a mot

. Turn ona pilot light

» Open/close a solenoid
. Analog Outputs (AO): Send va

o Examples:
» Adjust VSD speed

. Control valve position

(DO): Activate e devices

or via contactor

valve
riable control signals

ocks
device that ensures safety-critical

ds, and light curtains) are properly

Safety Relays and Interl
A safety relay is a fail-safe
functions (like E-stops, gual
executed.

Key points:
- Monitors circuits like emer

. Provides dual-channel redu
failures.

Must be reset manually after the f
Interrupts power to dangerous outputs

hydraulics).

You'll typically find:
. Dedicated safety circuit terminal blocks
. LED indicators showing status of safety functions

gency stops and safety doors.
ndancy to prevent single-point

   
  
 
 
 
  
  

ault is cleared.
(like motors OF

---

## Photo IMG_1704

pescription

    
  

 

   
  
    
 

 

     

Component
steps down A15VAC tO
Control Transformer >ANDCI Ac for control circuit

  
    
      
 

Modular /O (inpuvoutput)
cards, CPU and often labelled
correctly

  

 
  
  
 
 
     
  
  
 
  
 

 
  
 
  
   

 
 
 

‘ is.
Contains cables neatly, may Diagnos! |
voltage at PL
contain cable labels within . Check control g
24NDC)-
eam fuses, or

_ inspect ups

here
A556 multimetet

wiring pucts/Trunking

 
 
 

Connects field devices to
control components

spec.
Fix:

- Restore blown fuse Of re

.- Replace faulty PSU oF k

e Ensure all terminations

Terminal Strips
Brightly coloured (often
Safety Relays red/yellow) and controls E-
stop devices
Each wire and device should
Labelled Tags have a number relating to the
schematic
This screen Is to view and

HMI (Human Machine
Interface) control the processes

   

 
 
  
 
 
     
     

 
  
 
 

2. PLC in Fault Mode (F\

Symptoms.
. CPU has ared or att
» HMI may show fault

Diagnosis:

— ~ Contact available f
ca who can access th
me
cA
= ome |
—

 

       
           
  
  
 
   

» Read error or diac
« Common causes
fault, watchdog t

Pro Tip:
or the LED status indicators On 1/0 cards. These

Always look f
give immediate clues: input on, output active, oF fault present.

100

---

## Photo IMG_1705

Description

off power tO panel for

safe access

ys down A15VAC tO
~{AC for control circuit

jar UO (input/output)
>PU and often labelled

correctly

ns cables neatly, May
in cable labels within
here

ects field devices tO
ntrol components

ntly coloured (often
low) and controls E-
stop devices

jre and
number relating to

schematic

is tO view and

creen
processe>

trol the

on VO cards.

ive, OF fault present

device should
the

       
   
  

er to cont

who |s proficient in the software

Diagnosis:
. contact aval
who can access the PLC.
. Read error or diagnostic code.
» common causes: corrupted Pro

fault, watchdog timeout.

gram, memory full, hardware

101

PDORDODODDOEODEOED

---

## Photo IMG_1706

Fix:

- Re-upload valid prog!
- Clear memory and reload.
« Replace faulty CPU module if hardwat

am from backup.
e is dead. = |
5, Program Logic Faults

Symptoms.
s Inputs and outputs are fine

or sequences out O

3. Input Not Registering
a - Timers
pondi

Symptoms:
but PLC doesn't respond. =
- HMI controls not res

¢« Sensor/switch is active,

« Input LED on PLC module remains off.
Diagnosis:

rect yoltage- |
a “a - Contact available person
, who can access the PEC.

Diagnosis: i
vice is working and receiving
jagnostic |

¢ Confirm field de
- Measure voltage at PLC input terminal. |
or broken = |

| . Read error or d

« Check wiring for damage, loose terminals,
conductors. ual 7
EIXe crix: |
. Correct logical errors in
- Re-download updated O

- Repair wiring or replace failed sensor.

- If input is present but LED still off, replace input module.

« Check common terminals—PLC input modules often require . Check memory areas fo
(e.g., stuck bits or coun

a shared return.

4. Output Not Working 6. Communication Loss
Symptoms:

« HMI is blank or says

Symptoms:
- Output LED on PLC is on, but the device doesn't activate
(e.g., motor won't start).
g ) - Remote I/O or drives s

) e SCADA can't access

- Solenoids or contactors don’t respond.
Diagnosis:
- Measure voltage at PLC output terminal when LED is on. . Diagn OeS
- Check if fuse on output module is blown. ) * Check network cable
. Inspect field wiring and device (e.g., motor contactor coil). - Look for switch or ro
For relay outputs, check relay contact resistance (may be - Use ping or software
¢« Check IP address ci
« Inspect CPU or co

burnt).
Pro Tip: Always confirm isolations are in place before working on on
omeone accidentally. > Reset or reconfigu

electrical equipment — Saves injuring s
102

---

## Photo IMG_1707

from backup.

1.
ule if hardware is dead.

it PLC doesn’t respond.
. remains off.

king and receiving correct voltage-

put terminal.
oose terminals, OF broken

ed sensor.
till off, replace input module.
PLC input modules often require

t the device doesn't activate

respond.

it terminal when LED is on.

2 js blown.
(e.g., Motor con
-ontact resistanc

tactor coil).
e (may be

are in place before working on
g someone accidentally.

  

ERARR AE HHHH

     
      
      
      
  
       
   
    
    
     
   
   
   
     
 
  
 
   
 
 
  
 
  
   
 
  
  

ulty output module.

id-state output
place actuator.

Fix:
- Replace blown fuse or fa
- Replace burnt relay OF sO
- Repair damaged field wiring or re

 
 

5. Program Logic Faults
Symptoms:
- Inputs and outputs
. Timers or sequences out of syn
- HMI controls not responding as
Diagnosis:
- Contact available p
who can access the PLC.
Read error or diagnostic code.

are fine, but machine behaves incorre’

c
expected.

  

ersonnel who is proficient In the softw

Fix:

rogram.
kup version of correct logic.

tion or unwanted values

Correct logical errors in the p
- Re-download updated or bac
- Check memory areas for corrup
(e.g., stuck bits or counters).

6. Communication Loss (PLC — HMI or Network Devices)

Symptoms.
. HMI is blank or says “comm error.”
. Remote 1/O or drives stop responding.
« SCADA can't access PLC.
Diagnosis:
- Check network cables and connections.
» Look for switch or router faults.
Use ping or software tools to test connectivity.
Check IP address conflicts or mismatches.
t CPU or communication module status LEDs.

 

« Inspec
FIX:
» Reset or reconfigure network hardware.

103

Pre

---

## Photo IMG_1708

Pro Tip:
If you're unsure where the fault
with no load. Then reconnect devices one-by-one while

 

 

failed communication module.

- Replace
sses If duplicated.

- Reconfigure IP addre

7. Faulty Safety Inputs or Relays

Symptoms:
- E-stop won't reset.
- Safety light curtain blocks machi
- Safety relay shows fault indicator.

Diagnosis:

- Inspect status u
- Measure voltage across input cha

ne from starting.

en yellow/red).

EDs on safety relay (oft
(must be balanced

nnels

for dual-channel).
closed or unblocked.

- Confirm all guards/safety devices are
- Look for earth faults or feedback wiring errors.

Fix:
- Repair faulty E-stop or door switch.
- Reset safety relay once all safety conditions are met.

- Replace safety relay if internal fault detected.

General Tips for PLC Troubleshooting
- Label Everything: Proper labelling make

easier.

« Use Schem
//O connections.

- Record Changes: Log all program updat

mods.
Look at LEDs: They're your first line of defence in fault

 

diagnostics.

monitoring current draw.

 

s tracing faults much

atics: Compare panel wiring to diagrams to trace

es or field wiring

is, start by powering the supply

ng Ea
esting
ors such as pres
en output @ A-é
ng. These an

+ to electrical {

or Fault SY

Common sens
ws 0.0, “out

. Display sho
_ mi or PLC tags ar fro

. The process reacts Inc¢
. Field devices don't res}

conditions.

How to Test 4-20 mA Sé

Step 1: Visually Inspect
-» Check terminations 4

. Look for broken, burt
. Ensure correct pola

Step 2. Measure the Lo
Tool Needed: Clamp

series current capabilit

Method 1: Using a cla

- Use aloop clamp

conductor of the |

¢« Read the current
Method 2: Using a

- Break the loop c

« Place multimete

supply.
+ Set the meter t

---

## Photo IMG_1709

On module.
‘duplicated.

‘ys

chine from Starting.
ator.

relay (often yellow/req).
channels (must be balanced

-€S are closed or unblocked.
>k wiring errors.

itch.
ty conditions are met.

ault detected.

ting
g makes tracing faults much

wiring to diagrams to trace
updates or field wiring

e of defence in fault

ny powering the supply
e-by-one while

  
 
 

    
 

Testing Faulty. Sensors

e, temperature, flow, and leve
|, which represents @

     
   
    
   
 
 
  
 
 
 
 
 
  
  
 
    
  
 
  
 
  
 
 
  
   
 

Industrial sensors such as pressur ;
transmitters often output a 4-20 mA signa

used becau
live, linear reading. These analog loops are widely : er
- i se and can be monitored OVET
. they're resistant to electrical noise an
=a long distances.
=

Common Sensor Fault Symptoms: :
— - Display shows 0.0, “out of range,” or “sensor error

- HMI or PLC tags are frozen or fluctuating.

Te « The process reacts incorrectly or goes into alarm mode.
—= - Field devices don’t respond to changes in process
——4 conditions.
= How to Test 4-20 mA Sensors
5 tata Step 1: Visually Inspect Wiring
¢ Check terminations are tight and correct.

— ¢ Look for broken, burnt, or corroded wires.

- Ensure correct polarity (especially for loop-powered devices).

Step 2: Measure the Loop Current
Too! Needed: Clamp meter with mA scale or multimeter with
series current capability (mA range).
Method 1: Using a clamp meter on mA range
¢ Use a loop clamp meter (e.g., Fluke 773) around a single
conductor of the loop.
« Read the current directly—normal range is 4.00 to 20.00 mA.
Method 2: Using a multimeter in series
« Break the loop circuit.
« Place multimeter leads in series with the sensor and power
supply.
« Set the meter to mA DC and read the current.

 

 
 
 

105

---

## Photo IMG_1710

Testing a Sensor
Current

Sensor fault, open loop OF

wiring iSSUe

Sensor powered but
measuring Zero

infinite §

Normal mid scale reading ' ; PT100R sen
D damat

1
T

Full scale reading

Possible short, over-range Of a
internal fault |
. da
_Step 3: Simulate or Substitute Signal
- Use amA loop calibrator to simulate 4-20 mA signal and
confirm the receiving device (e.g., PLC input card) Is
working. .
g ae ; Pro Tip:
- If you have a known good spare sensor, temporarily install it ALNRUeIeCEt
to test the loop. 2 es on the PLC or
lf you're reading O mA or af

Step 4: Check Sensor Supply Voltage the sensor and simulate a 4

» Some sensors require 24VDC or loop power. a CoM
» Test across supply terminals with a multimeter. — e PLC responds correc

- Low or missing voltage could mean power supply failure or aes Mis isolates the fat
wiring issue. evice In the loop.

---

## Photo IMG_1711

Condition

Sensor fault, open loop or
wiring issue

    
 

Sensor powered but
measuring zero

    
 
   
 
 

Normal mid scale reading

 
  

Full scale reading

   

Possible short, over-range or
internal fault

  

na
nulate 4—20 mA signal and

.g., PLC input card) Is

> sensor, temporarily install it

le
loop power

a multimeter.
an) power supply failure or

  

ae

ed

thermistors)

 

e probes (RTDS,

   

Testing Resistance-TYP

   

istors:

   

RTDs and therm

   

Eor non-loop sensors like
Disconnect and Test Resistance :
. Use a multimeter on ohms setting.
. Measure across sensor terminals.

    
    
     
       
 
 
 
     
  
   

     

Near 0.Q (Broken
sensor OF
damaged wire)

 

infinite Q (Broken
sensor oF
damaged wire)

 
  
   

 
  
   
  

PT100R
TD

 
   
   

        
  
    
  

   
 

100.Q at o"c
temperature

 
   
   
  
 
 

  
   
    
 
  

  
   
   
   
  

 
    
   
   
 

       

Resistance
NTC Infinite Q (Broken | Near 0 Q (Broken
. “ decreases
Thermist 10k Q at 25°C sensor or sensor ot ith
damaged wire damaged wire
g mahtha © : temperature

     
 
 
 
  
 
 
  
  
    

 

or

Pro Tip:

Always test from the PLC or controller end first.

If you're reading 0 mA or a fault at the input terminal, disconnect
the sensor and simulate a 4—20 mA signal with a calibrator or
test loop.

if the PLC responds correctly, your sensor or field wiring is the

issue. This isolates the fault quickly without pulling out every
device in the loop.

---

## Photo IMG_1712

Troubleshooting Heavy Machinery.

ipment like
ile plant.

Overview

Heavy machinery in industrial s
conveyors, crushers, PUMPS; co
These machines are typically powered by large motors,
hydraulics, and control systems—often integrating PLCs, VSDS
(variable speed drives), safety relays, sensors, and HMISs.
Heavy machinery faults can cause major downtime and safety

risks, so accurate, efficient fault-finding is crucial.

ettings includes equ
mpactors, and mob

Step-by-Step Fault-Finding Process
1. Visual and Safety Inspection
« Lockout/tagout before working.
- Check for: loose wires, blown fuses, oil leaks, burnt
components, stuck contactors, OF emergency stop engaged.
- Make sure all guards are in place and no safety interlocks

are open.

 

 

2. Check Power Supply
. Test incoming three-phase voltage at main terminals (L1-L2-

L3) using a multimeter.

e Look for:
o Imbalance between phases

o Voltage drop under load
> Loose terminals (especially in vibration-prone

environments)

 

3. Test Control Circuit

 

» Use a control circuit diagram if available.

Peed

——

———
re
=

7. oY
eed
od

+ run?

> test coil of contactor
> Measure resistance C
phase and phase-to-

\if VSD Is installed:
> Look at the fault cod
o test for correct enal
> Confirm output volte

5 Sensor and Field Device
- test all limit switches,

proximity Sensors.
. Use a multimeter to c
- For analog devices, t

 

6. Use Bypass/Test Mod

- \f the machine has é
sections.

- Temporarily bypass

response—onlly if if

f. Check Hydraulic or
¢ Look for stuck val
- Use pressure gat
« Check if solenoid

---

## Photo IMG_1713

Ng Heavy Machinery

al settings includes equipment like
, COMPpactors, and mobile plant.

' Powered by large motors,
ns—often integrating PLCs, VSDs
/ relays, Sensors, and HMIs.

aUSE Major downtime and safety
It-finding is crucial.

rocess

ng.
n fuses, oil leaks, burnt

S, OF emergency stop engaged.
lace and no safety interlocks

age at main terminals (L1-L2-

nN vibration-prone

uilable.

ame 6. Use Bypass/Test Mode (if safe to do so)

  
  

  

a | po
: ee at 110/240VAC contro! P
0 2
ency stops aN

         
     
 

| o Emerg
| > Start/stop pushbutton
=— voltage a resales or operly (
— >» PLC or relay logic IS seq
: or PLC status LEDs)
oe my
~ 4. Check Motors and Drives |
- Motor won't run? eg
"te > Test coil of contactor (does it ae = onset
eo > Measure resistance of motor winding oe
—— phase and phase-to-earth

, - If VSD is installed: ,
= > Look at the fault code on display oe
> Test for correct enable signal and reference Inpu

o Confirm output voltage and frequency to motor

 

pti |
a 5. Sensor and Field Device Testing
__ - Test all limit switches, pressure sensors, encoders, and
proximity sensors.
— - Use a multimeter to check voltage change on actuation.
a - For analog devices, test for 4-20 mA or 0-10 V output. 1

- If the machine has a “test” or “jog” function, use it to isolate “4
sections.

¢ Temporarily bypass sensors (using jumpers) to confirm logic
response—only if it doesn’t compromise Safety.

—4

=

—

= 7. Check Hydraulic or Pneumatic Systems

—— + Look for stuck valves, low pressure, or air leaks.
—
—
cs

- Use pressure gauges to test system health.
« Check if solenoids are energising when commanded.

---

## Photo IMG_1714

Example Fault Scenario: Conve yor Belt Will Not

Start

System Setup:
- 3-phase conveyor motor controlled via VSD
- Start/Stop buttons at focal station
- Safety circuit with E-Stop and belt misa
- PLC handling start signal logic and displayin

lignment limit switch

g status On HMI

Scenario:
A conveyor belt system driven by a 3-phase motor and
ould not start. The

controlled via a VSD (Variable Speed Drive) w

operator attempted to start it both from the HMI and the local
Start button, but nothing happened. The motor made no sound,
and the contactor didn’t pull in. The VSD displayed “Ready,” but

the motor wouldn't run.

Initial Checks:
- Verified 3-phase power present at the main isolator.

« VSD confirmed power was good by showing a “Ready”

status.
- 24VDC control voltage was present at the PLC and HMI.

Testing:
Pressed the Start button — no 24V signal reached the PLC

input that triggers the run command. Start pushbutton tested OK

and was closing momentarily as expected.

Diagnosis:

Traced the Start signal path through the safety circuit. Found the
belt misalignment (drift) limit switch was stuck in the open
position, breaking the circuit. Emergency stop was checked and

confirmed reset and latched.

 

aced the faulty pelt drift
switch to rigger! prc

. adjusted
ao \ operation of the

. Verified fu

Outcome:
stem resumet

The conveyor Sy
signal passed correctly throug
ran when commanded.

Key Lesson.
When a start command does

check the full path — especi
and E-Stops, which often int

Root Cause.
Belt had walked out of aligh

switch was not resetting d
replacement.

Pro Tip:

Safety limit switches in he
to fail due to physical we
actuation and electrical «

---

## Photo IMG_1715

Conveyor Belt Will Not

 

itrolied via VSD

ation

d belt misalignment limit switch
ic and displaying status on HMI

/ @ 3-phase motor and

eed Drive) would not start. The
from the HMI and the local

J. The motor made no sound,

= VSD displayed “Ready,” but

at the main isolator.
1 by showing a “Ready”

ent at the PLC and HMI.

ignal reached the PLC
Start pushbutton tested OK

cted.

e safety circuit. Found the

> stuck in the open
y stop was checked and

  

prneiea

a

U

 

Temporary Test:
As part of a controlle i
procedures), the belt drift lim!
Pressing the Start button now $ ; ae oe
The VSD received the run commane:

d test (followin
t switc

 
   
 
  

expected.
Fix: ae

- Replaced the faulty belt drift limit ‘ie belt Is aligned:

. Adjusted switch to triggel properly . uit

- Verified full operation of the safety cIrcUn:
Outcome: : start

eration. The
em resumed normal Op nd the motor

The conveyor syst
signal passed correctly throug

ran when commanded.

h the safety chain, 4

e PLC or VSD, always

Key Lesson:
like limit switches

When a start command doesn't reach th
check the full path — especially safety devices
and E-Stops, which often interrupt control circuits silently.

Root Cause:
Belt had walked out of alig
switch was not resetting due to mechanica

replacement.

 

nment and tripped the drift switch. The
| wear—needed

Pro Tip:
Safety limit switches in heavy machinery are often the first thing

to fail due to physical wear or impact. Always check mechanical
actuation and electrical continuity when a machine won't start

---

## Photo IMG_1716

How to Test a Motor

Overview
Three-phase motors are t
—used in fans, pumps, conveyors, com
equipment. Most faults fall into three ma
1. Electrical faults
2.Mechanical faults
3.Control/system faults
Knowing how to correctly test motors before pu
saves hours of labour and downtime.

he workhorses Of the electrical industry
pressors, and processing

in categories:

    
    
  
  
 
 
  
 
 
  
  
 
 
  
  
  
  
 
 
  
 
 
  
 
 
 
  
 

 
 
  
 
 

ling them out

 

Motor Testing Procedure

1. Visual Inspection
« Check nameplate for voltage, current, and wiring config
¢ Look for burnt smell, discolouration, cracked insulation, oil

ingress
2. Supply Check
- Use multimeter or clamp meter to check:

o Voltage on all 3 phases (should be within +5%)

o Phase rotation if applicable

0 Current draw per phase
c— a
|

3. Insulation Resistance Test (Megger Test)
¢« Use 500V or 1000V insulation tester

- Test each winding to earth and winding-to-windin
: : —
Crema —
If the supply is balanced and the motor still won't run, the issue Is |
internal. ——

Vv Winding t©

if readin |
| the winding insulation

Pro tip:
\f Motor Is e
between phases as itis

not mean a dead short!

    
    
 
    
   
 
  
   
  
 
    

  
  
 

Earth

nding to Earth

      

W Wi

 

MQ), this Wi
breaking do\

 

gs are low (<1

wired in Star then you |
testing b

4. Winding Resistance Test
. Use a low-ohm meter (mill:
- Compare U-V, V-W, and \
« They should be very close
- Ahigher reading on one V

connection
« Alower reading = shortet

5. Continuity to Earth
« Test each terminal to m
- Should be open circuit

---

## Photo IMG_1717

How to Test a Motor

tOrs are th
€ workhorses of the electrical industry

umMps,

ne ee ESO and processing
. main categories:

ults

1 faults

urectly test mot
Ors before pullin
ur and downtime. p g them out

Procedure

}

a voltage, current, and wiring config
, discolouration, cracked insulation, oil

‘lamp meter to check:

phases (should be within +5%)
‘applicable

‘ phase

> Test (Megger Test)
sulation tester
arth and winding-to-winding

d the motor still won't run, the issue is

112

OUEEEEETETEE

  

 

 

 
  
  
 

9 Earth

  
   

W Winding t

  

will be due t0 water ingress or

  

(1 Mo), this

f readings are low
If r g breaking down.

the winding insulation

g of OMQ

Pro tip:
t. This does

If Motor is wired in Star then
between phases as it is testing
not mean a dead short!

you will get a readin
back to the star poin

 

4, Winding Resistance Test
. Use a low-ohm meter (milli-ohm if possible) or multimeter
\

» Compare U-V, V—W, and U-W

» They should be very close (within 10%)
« Ahigher reading on one winding = possible open or corroded

connection

A lower reading = shorted turns ‘ i

5. Continuity to Earth
* Test each terminal to motor frame
¢ Should be open circuit

113

---

## Photo IMG_1718

6. Rotation Check
- Apply short puls
- Observe rotation direction
- Swap any two phases to revels

e of 3-phase power

e if needed

Real-World Fault Example: Pump Motor Trips

Breaker on Start

Scenario:
A 5.5 kW pump motor tripped the circuit breaker immediately
movement or sound was

every time it was started. No motor
observed — the breaker tripped the moment the start button was

pressed.

Initial Checks:
. Verified 400V supply present on all

motor isolator.
- Confirmed breaker si

motor load.

three phases at the

ze and cable rating were appropriate for

Testing:
Performed insulation
and earth:

« U-—Earth: 0.1 MQ
» V—Earth and W-Earth: similar low readings

This reading was far below acceptable limits (typically >1 MQ
minimum), indicating insulation failure or moisture ingress.

resistance (IR) test between each phase

Investigation:
Opened the motor terminal box for a visua

clear signs of water ingress — moisture an
terminals and windings.

| inspection. Found
d corrosion around

 

motor was ©
field repal’-

Key Lesson:

LOW insulation

breaker tripping.
energising: especially a
conditions. Even if the
damage May require a

resistance
Always |

Pro Tips:
Check the motor ter

very common fault.
Many faults show Up
thermometer if you h

m

---

## Photo IMG_1719

IASC POwer
n

ole: Pump Motor Trips

the circuit breaker immediately
10tor Movement or sound was
d the moment the start button was

it On all three phases at the

cable rating were appropriate for

(IR) test between each phase

low readings
able limits (typically >1 MQ
ire or moisture ingress.

visual inspection. Found
ure and corrosion around

  
  
   
  
 
  
 
 
 
  
 
  
  
 
 
  
  
 
   
 
  
  
 
  
  
  

DODD odeeeesergs

Drying: : +
Retest After Drying 4 resistance ri

Tried drying the motor and re-testing insulatto

drying: a
sin
. IR readings still below 1 MQ — not safe for energ! g

Fix:
Motor replaced with a new unit.

: : ent.
Faulty motor sent for professional rewin nm

d and refurbis

Outcome: "
New motor installed and commissioned without issue- Brea
mal load. The failed

held on start, and the pump ran under nor F
motor was confirmed to have internal moisture damage beyon

field repair.

Key Lesson: :
Low insulation resistance is a common Cause of immediate

breaker tripping. Always IR test suspect motors before
energising, especially after exposure to moisture OF poor storage

conditions. Even if the motor appears dry, internal winding
damage may require a full rewind or replacement.

Pro Tips: 7
Check the motor terminal box—loose links or worn lugs are a

very common fault.
Many faults show up as heat first—use an IR camera or laser

thermometer if you have one.

---

## Photo IMG_1720

—

eee oe ,

 
 
     
    
   
    
  
 
      
    
 
  
  
 
 
 
 
  
 
 
 
 
 
  
 

i | \ »sistar
Single-Phase Motor Fault Finding aaa
ov insuir’ eco earth ana Wi
ach winding to earl ' ON
Overview =e { Ge eading =i O0
7m al Healthy | :
e Typic4 : Q TVAy Ho Cliv!

Single-phase motors are commonly found in domestic and light

commercial equipment — such as fans, pumps, air conditioners,
and small machinery. Unlike three-phase motors, single-phase a ang Resistance Test :
motors require a start mechanism (capacitor or auxiliary winding) <= A. windin jow-ohm meter OF mute
to create a rotating magnetic field. ’ Use 4 Bc and start windings &
= , i Serading should have low!
Most faults can be grouped into: cs ee winding typically nas hig
1. Electrical faults 22)
2.Mechanical faults —s wife: with manufacturer |
—s oo _ infinite rest

2 Control/start circuit faults ra is
winding
- Ope! : unusual!

Accurate testing and diagnosis save unnecessaly motor — +4 Shorted winding -
replacements and downtime. "

: 5. capacitor Test
Motor Testing Procedure —s Use a capacitance meter t

es the nameplate ot

match
on

. Afailed capacitor isac

1. Visual Inspection
won't start Of hums but da

» Check the motor nameplate for correct voltage and wiring

diagram.
» Look for burn marks, swollen or leaking capacitors, cracked

—-
=a
Pro Tip:
insulation, es signs oh eae , : Always discharge capacitor
» Check cooling vents for DiIoCKages and dirt buildup. your meter oF electric shoc!
2. Supply Check :
Ee ee to confirm correct supply voltage at the 6. Mechanical Check
BE : - Rotate the shaft by he

motor terminals. Ree eS

: indi
. Verify that start/stop controls are working properly. ee a oe
» For capacitor-start motors, inspect the capacitor visually — - Listen for bearing NO

look for bulges or leaks.

cs

arsonist

---

## Photo IMG_1721

lotor Fauit Finding

10nly found in domestic
as fan |
ae S, Pumps, air Condition
aS€ motors, Single-pha as
se

M (Capacitor 0 i
Id. auxiliary winding)

and light

Ve unnecessary motor

correct voltage and wiring
leaking capacitors, cracked

1g.
2S and dirt buildup.

ct supply voltage at the

orking properly.
the capacitor visually —

a

COD ondeeeegge

       
    
 

3. Insulation 2

Use a 500V insulation testel. ving to-windid
. Test each winding to earth and W

cin a ve contaminated:

- Typical healthy rea ne damag ed or

If <1 MQ, the winding May

4. Winding Resistance Test :

Use a low-ohm meter or multimeter.

d start windings separately:
resistance.

esistance due t

- Test main an
Main winding should have lower

Start winding typically has higher

wire.

Compare with manuf
Open winding — infinite resistance
Shorted winding — unusually low resistance

o thinner

acturer specs If available.

5. Capacitor Test
- Use a capacitance meter to check |

matches the nameplate or motor specs.
- A failed capacitor is a common reason a single-phase motor

won't start or hums but doesn’t turn.

f the capacitor value

Pro Tip:
Always discharge capacitors before testing to avoid damage to

your meter or electric shock (short out the capacitor pins safely).

6. Mechanical Check
- Rotate the shaft by hand — it should spin freely without

binding or excessive noise.
« Listen for bearing noise or signs of rotor rubbing.

117

---

## Photo IMG_1722

won't

   

ms but

 
 

motor Hu

 
 

orld Fault Example: Fan

     

Real-W
Start

  
     

ever spin up

   

oudly but n

 

Scenario: : “
A small exhaust fan motor would hu

to speed.

   
         
  
 
   
  
  
 
  
 
 
 
 
 
 
 
 
 
 
 
 
 
   

   
   

Initial Checks:
- Verified correct SUP
- Inspected capacitor — foun

otor terminals.
g and oil leak.

     

ply voltage atm
d bulgin

 
  
 

Testing: ee f the os
» Measured capacitance: 0 HF (open circuit) instead © .
rated 6 UF. cane —,
» Checked windings for continuity: both start and run winding :
OK. @ be
Fix:
- Replaced the faulty capacitor with a new one of correct i
rating. ay
Outcome: —
Fan started immediately and ran at normal speed. J
= on
Key Lesson: a
A failed capacitor is one of the most common single-phase mt
motor faults. Always check it first if a motor hums but won't turn. ]
me ly

=z

—s
ce
ca

118 |

‘

\

\
}
\

---

## Photo IMG_1723

Verifying Repairs and Ensuring
Operation

job—verifying t
portant.
ssue |S trul

“ing that the system

Completing 2 repair is only half the .
is safe, reliable, and compliant is just as 1ME
ensures you leave the job site knowing the |!
and nothing else was introduced in the process.

Final Verification Checklist

- Visual Re-inspection
> No loose terminals, wires, OF components

> Cable insulation intact and properly dressed
© Correct tools removed from enclosures
o No foreign objects or debris left in panels

 

- Electrical Testing
> Confirm correct voltages presen

o Insulation resistance checked (if ap
© Earth continuity verified
o No signs of phase imbalance
¢ Functional Testing
o Operate the circuit/system under normal load
Monitor start-up and shut-down behaviour

ton all terminals
plicable)

 

°

© Check any auxiliary functions (indicator lights, buzzers,

fault indicators, etc.)

o Observe for tripping, buzzing, sparking, or heat buildup

Safe

; iS
esi 1 m
grim te

cont

 

| sysen>
HVAC:

: clly re
ore =. Morito! cut
° motol :
remPp
LPC Ce.
cequenc?
, Appliances:
features

——a
——ws
—s
—a
—s
—s
cs =
cs
o—m
os
es
a3

 

> Update any
records
> Mark replaced parts cl

Record test results in

Clienvoperator communt

> Explal
Advise I parts
\f applicable, demot

equipment

n what was WT
need

Pro Tip:
Walk Away With Confidet

\f you're not comfortable

system run through at le
finished yet. Remembe'
everything to the regt

---

## Photo IMG_1724

airs and Ensuring Safe

Operation

», half ie job—verifying that the system
p fant IS Just as important. This section
) Site Knowing the issue is truly fixed

duced in the process.
ist

wires, or components

act and properly dressed
=d from enclosures
- debris left in panels

JES present on all terminals
checked (if applicable)

10

alance

em under normal load
ut-down behaviour

stions (indicator lights, buzzers,

Zing, sparking, or heat buildup

- System-S ifi
> HVAC: Confirm temper

> Motors: Monitor

temperature activity oa
> PLC Panels: Confirm correct input/output

o Appliances: Test ful

     

« Labeling

o Update any fault tags, isolatio

 

Tests
ature control

correctly |
current draw, noise,

sequence
features

& Documentation

records

° Mark replaced parts clearly if needed
° Record test results in logbooks or main

- Client/operator communications
© Explain what was wrong and how it was fixed

o Advise if parts need follow-up maintenance Of attention
© If applicable, demonstrate how to safely operate or reset

equipment

Pro Tip:

Walk Away With Confidence
If you're not comfortable leaving the site without watching the
system run through at least one full cycle, then you're not
finished yet. Remember it is your license; have you left
everything to the regulatory standard?

| functionality, inclu

n labels, or lockout/tagout

 
 
  
  
 
  
  
 
 

ding safety

 
   

    

 

     
    
 
   
 

  

tenance systems

---

## Photo IMG_1725

ve Measures

: as
i nd preventall
Maintenanceand Ee. seagate —
cure. Reguiat
: =u

ways better (and cheaper) tha :
es breakdowns and costly downtime
ore they become major

yentative practices for
nd industrial settings.

 

Prevention Is al
maintenance not on
but also helps detect sma
faults. This section covers ©
electrical systems across CO

ly reduc
\| issues bef
ssential pre
mmercial a

General Preventative Measures

1.Routine Visual Inspections
heat damage: corrosion, Of weal.
of arcing.

> Look for signs of
nals and signs

——s
=—s
8
75
> Check tightness of termi cs
led, especially outdoors. om
sm
a |
=
=o

 

> Ensure enclosures are sea
2. Thermal Imaging
> Use infrared cameras to detect hot spots in
switchboards, motor terminals, and control panels.
> Athermal scan can reveal poor connections Of

rloaded components before they fail.

t should be carried out and signed

! ove
| o Ifa report is required, |

off by a certified thermographer.

3. Torque Checks
>» Schedule torque checks on busbars, contactors, and
cable lugs annually or as per manufacturer Specs.

> Vibration, load cycling, and thermal expansion all loosen

terminals over time.

4 Filter Cleaning & Cooling_Checks
d control panels, dirty filters and

> In HVAC systems an
blocked cooling fans are a major Cause of overheating.
> Keep ventilation paths clear to prolong component life.

RCDs and Breakers Regularly
ithin the time specified by ASINZS

 

5 test
> RCDs should trip W

 

3000.
> Also consider insulation and loop impedance testing

during routine maintenance.
122

-
A

---

## Photo IMG_1726

eventative Measures

| cheaper) than cure. Regular
reakdowns and costly downtime
ss before they become major
1tial preventative practices for

ercial and industrial settings.

2S

—amage, corrosion, or wear.

nals and signs of arcing.
ealed, especially outdoors.

detect hot spots in
ninals, and control panels.

al poor connections OF

before they fail.

should be carried out and signed

rapher.

on busbars, contactors, and

per manufacturer specs.

id thermal expansion all loosen

Ck
trol panels. dirty filters and
f overheating:

. major cause 0 |
ar to prolong component life.

qularly
> time specified by ASINZS

d loop impedance testing

>
7+

---

## Photo IMG_1727

Glossary

AC i
fas Connaaes Current) — Electrical current that reverses
et Do typically used in power grids.
: e (Live) Conductor — A wire that carries current from the
F wer source to a device or circuit.
ppliance — A device that u ici
ses electricity to perform
such as a heater or oven. ee oo
Arc —
pe Flash: sudden release of energy caused by an electrical
ault, creating intense heat and light
Bac “ae . . . ‘
Pcs when electricity flows in the reverse direction of the
ed supply pou usually from an alternate source (like a
eden solar inverter, or UPS) back into the system.
PEA — a component that stores and releases electrical
energy in a circuit.
Circuit — A complete path for electrical current to flow from
source to load and back.
Seat Breaker — An automatic device that interrupts power
when it detects an overload or short circuit.
Client — The person or organisation requesting or receiving

electrical services.
Coil — A wire wound into a spiral, often used in relays,

transformers, and motors.
Commercial — Electrical work involving shops, offices, and

businesses.
Compressor — A device used to increase pressure in HVAC and

refrigeration systems, typically motor-driven.
Contactor — An electrically operated switch used for switching a

power circuit, especially in motors.
Control Board —A circuit board that manages functions in

appliances OF machinery.
Current — The flow of electri

measured in amperes (A).

cal charge through a conductor,
124

Psy

MG

n
—s of mot W. :
pelta-/ od iedin a triand ause
=m ‘adi onnec a
windings . proces of ident
—s jagnose a
ay cet in electrical pmo starting method whe
DOL (Direc n-Line) Rai tor terminals al
cs voltage 1S @ lied directly 19 i gential NO es ors
_ Electrical rk in
— ance { to retum
dwellings. oi electrical curren rt
S— se Earth (Ground) — Asafety Pa
os the ground in case of a fault. ances a One rts
Element —/A resistive component In applia
= electricity into heat. ie
Electricity — The flow of electrical energy created by
movement of electrons.
E-Stop (Emergency Stop) —A switch that immediately cuts
; ency.
em =o power fo machinery in case of emerg a
Fuse —A safety device that melts and breaks the circuit when

BEQDDODDDOREH

 

   
 
   
   
   
 
   
     
       
    
      
         
        
        
  
   
 

current exceeds a set value.
fluid to perform

Hydraulic — Asystem that uses pressurised
mechanical work.
HVAC — Heating, venti
impedance — The total oppositio
resistance and reactance.
industrial — Electrical wor
heavy machinery settings.
insulation — Material that preven
current from a conductor.
Isolation — The process of separating a circuit or equipment
from its power source for safety.
Junction Box — An enclosure that protec

conditioning systems.

lation, and air
to AC, including,

na circuit offers
k in factories, large-scale plants, OF

ts the unintended flow of

ts and joins electrical

conductors.

125

---

## Photo IMG_1728

ass

 

LOTO (Lock

Out

is disconnected ee Out) — A safety procedure ensurin
cannot be reconnected during mai Q power

MCB (Mini pean
eae , ature Circuit Breaker) — A compact devi
circuits from overload and short circuit eee

it.

 

MCC Room
BOncing eet Control Centre) — A centralised room
MEN System a se protection devices, and control gear
— ASaiely S : : :
Motor — A device that a es : witchbo S neat ievel:
separ nverts electrical energy into mechanical controls fo pressing
Multimeter — At Temper? ical
ool used to measure itored king elect"!
voltage, cu monitor r ches
Se in a circuit. : Wem ane alas Testing — e proces
verload —A condition its or CO ntrols
where too much cos ystems for faults erature co
device or conduct current flows through a | device th sens
or. +hermostat _ Adev!
Pneumatic — oling syste™ n
see poet that uses compressed air to transmit pean zoe e eae that chan es the yoltage \evel f a!
: Transto =
PLC (Programm : ae ctrical SU ply- wet
(Prog able Logic Controller) —A digital device used a a oe efers to components or circuits closet tO the Po
rocesses. =a upstrea
source. oints,
Safety gear such as voltage _— The electrical potential difference beween two P
its (V).
_ Adevice that controls motor

to control machines and p
tective Equipment) —
Imets used to reduce inju
power, three-phase Pow

|

er is —s

PPE (Personal Pro
ry risk.

gloves, goggles, and he
Phase —A stage in the cycle of AC

common in industrial systems.
Power Surge — A sudden increas
equipment.

Pump —A mechanical
by an electric motor.
RCD (Residual Current Device) —AS
disconnects power when it detects leaka
Relay —An electrically operated switch us

isolation.
Resistan

e in voltage that can damage

device that moves fluids, often powered

afety device that
ge current to earth.
ed for control oF

ce — The opposition to current flow in a material,

in ohms (Q).
_ The rotating part of

a motor or generator.

126

st
Cae
ss
—
faa
ae |
3
—s
cs

and yoltage:

measured in vO
rs, of transto

vsD (variable Speed Drive)
speed and torque by varying In
Windings — Coiled wires in mo

that create magnetic fields.

put frequency
rmets

rors, generato

127

---

## Photo IMG_1729

References and Standards

practices, regulato
ry compliance, and indu

: , stry e i
across Australia and New Zealand oo

Australian and New Zealand Standards

- AS/NZS 3000:2018 — Electrical Installations (Wiring Rules)

° ore reference for installation practices, safety, and fault
isolation procedures.

° ASINZ= 4836:2011 — Safe Working on or Near Low-Voltage
Electrical Installations and Equipment

°

Guidance for live testing, PPE, and safety protocols in
the field.

IEC 61010-1 — Safety Requirements for Electr

ical Equipment
for Measurement, Control, and Laboratory Use

> Defines testing equipment categories (CAT ratings) and
electrical safety.
IEC 60479-1 — Effects of Current on Hum
Livestock

an Beings and

o Source for electric shock thresholds and human
response data.

« AS/NZS 3760:2022 — in-service Safety Inspection and
Testing of Electrical Equipment

> Relevant for PAT testing and workplace equipment
checks.

- AS/NZS 3017:2022 — Electrical Installations — Verification by
inspection and testing.
- ASINZS 3019:2022 — Electrical installations — Periodic
assessments.

 

 
    

cS)
ament Re —— )
Cores work pus of - cactic®) jou
‘ co valid
“i Kaus alia)
work yon soe act 2014 (~austt rect aA work
york eal? ane et ernin sale
. Wot ee egisiation “
ets
environ . % ( oe hc
wee a al ponsibiliti@®
Cc :
regarding e ecirical a oon =)
. WA Electricity Licensi” = .
sO Electricity \au 2 a sane a
° Electricity Sa ; ne
‘ae Electrical eg ae a
. NSW Electricity safety RE i
. TAS Electricity Safety Act oa
aw Reform Act
+ NA Electricity R an

* ACK Electrical Safely Regulatio

129

---

## Photo IMG_1730

_ Switch

Switch
C-—— Fuse

  

        
      
  
   
  

Fuse
Cis Switch

J -—— isolator

Disconnector

-—— Fuse

Fuse
I——_ Disconnector

Switch
——“ of— Disconnector

Switch Fuse

o}—_ Disconnector
| | _ Capacitor
hit Inductor, Coil;

or Winding

 

Inductor
Magnetic Core

588
ee Diode

 

Ie
7

aa
ess

—l—

co

Se Antenna
G Generator
(Vv) Voltmeter cm
——
Ammeter
cos
Motor os
Lamp

Light Emitting Diode
(LED)

Normally open
push button (NO)

Normally Closed
Push Button (NC)

Emergency Stop PB
Normally Open (NO)

Emergency Stop PB
Normally Closed (NC)

Microphone

Loud Speaker

x———

socket

_ Female
oo
Connection
Wires Crossing
(Not Connected

Terminal
Block

Circuit Breaket

hk
Thermal
- overcurrem

131

---

## Photo IMG_1731

Electri

=ectrical Safety Checklist for Job
Sites

Use this checklist before, during

e an :
nsure safety compliance. d after electrical work to

= Pre-Work Safety Check
ee Protective Equipment (PPE) Reaay:
eel-capped boots (EH-rated if required)

Insulated gloves (Cl
ass
circuits) ( O or higher if working near live

Safety glasses/face shield for eye protection

Fire-resistant clothing (especially for high-voltage work)

Hearing protection (earplugs or earmuffs if in loud
environments)

- Dust mask/respirator (if working in dusty areas)
- Hard hat (if required for overhead hazards)

Tools & Equipment Checked:

e Voltage tester/multimeter functional and calibrated
. Insulated tools (screwdrivers, pliers, etc.) for live work
- Lockout/Tagout (LOTO) kit available

Job Hazard Analysis (JHA) Completed: :
Hazards identified and control measures In place
. Emergency procedures reviewed

Sign-In Requirements Met:
Signed in on-site | oe
Rae of emergency exits and muster point

es wor olati al
electric? gouree ag ware wor
- PON oo ane eet arti
tock? t 4ea0 pelo!
rested 10! ac nducrre oe AG
S ak
C os OF exp we circu
f work ra a wire se
Sa Enel ouch 4 whe work!
using roug” vandind
curent nditio 0
Avol
a d i . .
oe eee \-lit and 9 ue 4 ti 8 ee
ca see ne \a! ¢ neat \\
cable sate
Ladders Se {
3 post-Work fety ches
| n Proce ae |
Re Energisat ae -
nne Pa
a\\ tools an ae i . :
v
Lockou |

Incident Reporting:

ds reported
. Any neat misses Of hazat | :
. Injuries recorded and reported as per site policy

AS

---

## Photo IMG_1732

ACTION
PURPOSE

identify the symptoms of the
issue by gathering
information from reports

users or observation.

 
    
 
   
    
 
 

Understand the nature of the
fault and narrow down potential
causes.

  
  

   

1. Initial Assessment

  

 
  
 
 
 
  
   
   
 
    
 

tsolate power, check for
hazards, wear appropriate
PPE, follow lockout/tagout
procedures, verify the
absence of voltage, ensure
proper earthing, assess
risks.

  
    
    

Prevent injury and ensure
compliance with safety
protocols.

  

  

 
  
 

Refer to electrical
schematics and wiring
diagrams to understand how
the system operates.

 
    
     
  
   
 

identify possible failure points
based on circuit design.

  
  

3. Diagram Analysis

 
  

Use a multimeter, insulation
tester or clamp meter to do
basic checks on voltage,
nuity, resistance and

current.

 
    
     
   
  
    
  

Gather measurable data to
\ocate abnormalities.

   
 

  

4. Testing

conti

     
      
   
 
  
    

     

e the fault and determine

Analyse test results,
the root cause.

compare expected and
actual readings, and
eliminate unlikely causes.

\solat

  
  

5. Diagnosis

    
  
      

  

e or fix faulty
components, reconnect
loose wiring, or reset tripped

preakers-

Replac
Restore system functionality.

   

 
 
 

6. Repair

  
 
 
   

ensure the issue |S
fully resolved and prevent
recurrence.

  
  
 
 
 
 
    
 
   

 
 
 

Reapply powel, test under
ng conditions,

normal operat
and monitor performan

 
 

135

---

## Photo IMG_1733

See
Err

2. Safety Checks

¢ Lockout/Tagout completed (if needed)? (I

L

e Appropriate PPE worn?

handling?

|

|

e Environmental risks identified?
(e.g. water, confined spaces)

) 3. Diagram Analysis
| » Locate and review circuit or
equipment diagram

e« Understand how the system Is
meant to operate

- Identify key components and
connections involved

Highlight potential fault ZONES
based on symptoms

Confirm circuit is de-energised before

Ld

Narrow down to the likely Cause

Confirm the fault b

131

 

ee

efore replacing parts ‘a

---

## Photo IMG_1734

6. Repair
Repall, replace OF isolate a
. nd
(with an out- lockout

component

Re-terminat

Remove tem

 

 
 

of-service tag) the fau|
ty

  
 
   

e connections securel
y

porary test links or

bypasses

Restore full system function

7. Final Check
power on system and verify correct 3
operation Q Ss
B
Retest all safety systems 3
(e.9. RCDS; overloads) Ss
B

Confirm circutt matches original design ne
a
B

intent
ment your work 5

 

 
  

and docu

 

Clean up