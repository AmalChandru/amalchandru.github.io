---
title: 'How Containers Actually Work: Building Container Networking From Scratch'
date: '2026-02-04'
tags:
- networking
- container
- linux
---

Containers often feel like magic, and container networking can seem like
a higher form of black magic. A process starts, gets its own IP address,
can reach the internet, and talks to other containers. All without us
touching low-level networking.

But nothing magical is happening.

Under the hood, container networking is built from a small set of Linux
primitives: **network namespaces**, **virtual Ethernet devices (veth)**,
**routing tables** and **NAT**. In this write-up, we’ll build that setup
manually to see exactly what Docker and other container runtimes are
doing on our behalf.

## The Four Linux Primitives Behind Container Networking

Docker and container runtimes, in general, did not invent container
networking. They assemble a few Linux kernel features that have existed
for years.

Container networking is built on four core primitives:

- **Network namespaces**
- **Virtual Ethernet (veth) devices**
- **Routing tables**
- **NAT (iptables)**

### Network Namespaces: The Separate Network Worlds

A network namespace is a fully independent instance of the Linux
networking stack. When a process runs inside the namespace, it gets its
own:

- Network interfaces
- Routing table
- ARP table
- Firewall rules (iptables)
- Loopback device

It cannot see the host’s networking interfaces, and the host cannot see
its internal ones either (unless explicitly connected). From a
networking perspective, it’s as if that process is running on a
completely different machine.

> Container network isolation is simply a process placed inside its own
> network namespace.

That’s the foundation of container networking.

### Virtual Ethernet (veth) Pairs: The Wire that connects the Worlds

Now we have two separate network worlds: the host and the namespace.
They need a wire between them. That wire is a **veth pair.**

A veth pair is created as two connected virtual interfaces:

``` bash
veth-A <==== virtual cable ====> veth-B
```

Anything that enters one end comes out the other.

Typically:

- One end stays in the host
- The other end is moved into the container’s namespace

This is how packets physically move between the container and the host
network stack.

> A veth pair is just an Ethernet cable, except both ends live inside
> the kernel.

### Routing: How Packets Know Where to Go

Interfaces move packets, but routing tables decide where packets should
be sent. Each namespace maintains its own routing table.

When a process sends traffic:

1.  Kernel checks the destination IP
2.  Looks up the routing table
3.  Chooses the correct interface

Without a default route, a namespace can only talk to its own subnet. So
if a container wants internet access, it needs a rule like:

> “Anything not local -\> send to the host”

This rule makes the host act as a **gateway.**

### NAT: How Containers Reach the Internet

Containers usually use private IP addresses (like `10.x.x.x` or
`172.x.x.x`). The internet doesn’t know how to route traffic back to
those.

So the host performs Network Address Translation (NAT)

When packets leave the host:

- The container’s source IP is replaced with the host’s IP
- Return traffic comes back to the host
- The kernel maps it back to the original container

This is done using an iptables **MASQUERADE** rule

> Containers don’t have public IPs. They borrow the host’s identity when
> talking to the outside world.

## Putting It Together

At this point, container networking is no longer mysterious:

| Problem            | Linux Primitive That Solves It |
|--------------------|--------------------------------|
| Isolation          | Network namespace              |
| Connection to host | veth pair                      |
| Traffic direction  | Routing table                  |
| Internet access    | NAT (iptables)                 |

Docker is simply automating the creation and wiring of these pieces.

In the upcoming sections, we’ll build this entire setup manually (the
same way a container runtime does).

## Building Container Networking From Scratch

Now we’ll manually build the same network setup a container runtime
creates automatically.

We will:

1.  Create a **network namespace**
2.  Connect it to the host using a **veth pair**
3.  Assign **IP addresses**
4.  Add **routing**
5.  Enable **IP forwarding**
6.  Add **NAT**
7.  Test **connectivity**

### 1. Create a Network Namespace

This namespace will act as our “container”.

``` bash
sudo ip netns add myns
```

We can run commands inside it using:

``` bash
sudo ip netns exec myns bash
```

At this point, the namespace exists. But it has no network connectivity
except a downed loopback interface. Try listing the available links
inside the namespace.

``` bash
sudo ip netns exec myns ip link list
```

You’ll see the loopback interface.

### 2. Create a veth Pair (Virtual Cable)

We’ll now create a virtual Ethernet cable between the host and the
namespace.

``` bash
sudo ip link add veth-host type veth peer name veth-ns
```

This creates:

``` bash
veth-host <====> veth-ns
```

Move one end into the namespace:

``` bash
sudo ip link set veth-ns netns myns
```

Now:

| Side      | Interface |
|-----------|-----------|
| Host      | veth-host |
| Namespace | veth-ns   |

### 3. Assign IP Addresses

The two ends must be on the same subnet.

**Host side:**

``` bash
sudo ip addr add 10.10.0.1/24 dev veth-host 
sudo ip link set veth-host up
```

**Namespace side:**

``` bash
sudo ip netns exec myns ip addr add 10.10.0.2/24 dev veth-ns 
sudo ip netns exec myns ip link set veth-ns up 
sudo ip netns exec myns ip link set lo up
```

Now the host and namespace can **talk at Layer 3.**

Why bring up `lo`? Because every network stack expects a working
loopback interface. This ensures localhost works correctly inside the
namespace.

### 4. Add a Default Route Inside the Namespace

Right now the namespace only knows its local subnet. We make the host
act as a gateway:

``` bash
sudo ip netns exec myns ip route add default via 10.10.0.1
```

Now any traffic destined outside `10.10.0.0/24` goes to the host. The
namespace now has a **default gateway.**

### 5. Enable IP Forwarding on the Host

Linux drops forwarded packets by default.

``` bash
sudo sysctl -w net.ipv4.ip_forward=1
```

The host can now behave like a **router**. This change is temporary and
will reset after reboot.

### 6. Add NAT (Masquerading)

The namespace IP is private. We must rewrite packets leaving the host.

Replace `wlo1` with your internet-facing interface.

``` bash
sudo iptables -t nat -A POSTROUTING -s 10.10.0.0/24 -o wlo1 -j MASQUERADE
```

This makes outbound traffic appear as if it originates from the host.
This is the same mechanism home routers use to allow multiple devices to
share one public IP.

### 7. Allow Forwarded Traffic

``` bash
sudo iptables -A FORWARD -i veth-host -o wlo1 -j ACCEPT 
sudo iptables -A FORWARD -o veth-host -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
```

These rules allow traffic to leave and return. The first rule allows
outbound traffic from the namespace to the external interface. The
second rule allows return traffic for established connections, so
responses from the internet can flow back into the namespace.

### 8. Test Connectivity

**Namespace → Host**

``` bash
sudo ip netns exec myns ping 10.10.0.1
```

**Namespace → Internet**

``` bash
sudo ip netns exec myns ping 8.8.8.8
```

If this works, you have built **container-style networking** manually.

## What We Just Built

``` bash
myns process    
↓ 
veth-ns    
↓ 
veth-host    
↓ 
Host routing table    
↓ 
iptables NAT (MASQUERADE)    
↓ 
wlo1    
↓ 
Router → Internet
```

At this point, the namespace can reach the host and the internet. That
means we have successfully built container-style networking using
nothing but Linux kernel primitives.

Let’s look at what actually happened.

- We created a separate network world using a **network namespace**.
- We connected that world to the host using a **veth pair**.
- We told the namespace where to send unknown traffic using a **default
  route**.
- We allowed the host to forward packets by enabling **IP forwarding**.
- We let the namespace talk to the internet by adding **NAT
  (MASQUERADE)** rules.

That is the core of container networking.

When you run: `docker run nginx`

Docker performs these same steps automatically. It creates a namespace
for the container, wires it to the host network, adds routing rules, and
inserts iptables rules so traffic can flow in and out. What feels like a
high-level abstraction is just automation around standard Linux
networking features.

What we built is the **simplest container networking model:** one
isolated network stack using the host as its gateway.

> A container does not get special networking.\
> It is simply a process inside a separate network namespace, connected
> to the host using a virtual Ethernet cable.\
> The host acts as a router and performs NAT so the container can reach
> the internet.\
> Everything else in container networking builds on this exact pattern.

Real container platforms add another layer on top of this.

Instead of connecting each namespace directly to the host, they attach
multiple namespaces to a **Linux bridge**, allowing containers to talk
to each other as if they were on the same switch. That bridge is what
Docker exposes as `docker0`.

We’ll build that in the next part.
