# TCP vs UDP

TCP (Transmission Control Protocol) and UDP (User Datagram Protocol) are both transport layer protocols used in computer networks. Here are the key differences between TCP and UDP:

1. Connection-Oriented vs. Connectionless:
    - TCP is a connection-oriented protocol. It establishes a reliable and ordered connection between a sender and a receiver before transmitting data. It ensures that all data is delivered in the correct order and guarantees error detection and correction.
    - UDP, on the other hand, is a connectionless protocol. It does not establish a dedicated connection before sending data. Each UDP packet, also known as a datagram, is independent and can be sent without prior setup. UDP does not provide reliability or order guarantees.
2. Reliability:
    - TCP provides reliable data transmission. It uses acknowledgments, sequence numbers, and retransmissions to ensure that all data is successfully delivered. If packets are lost or arrive out of order, TCP retransmits them to maintain data integrity.
    - UDP does not provide reliability guarantees. It simply sends datagrams from the sender to the receiver without any acknowledgment or retransmission mechanisms. If a UDP packet is lost during transmission, it will not be retransmitted, and the receiver will not be aware of the loss.
3. Order of Delivery:
    - TCP guarantees the order of delivery. It ensures that data sent from the sender is received in the same order by the receiver. If packets arrive out of order, TCP reorders them before delivering them to the receiving application.
    - UDP does not guarantee the order of delivery. Packets can arrive at the receiver in a different order than they were sent.
4. Congestion Control:
    - TCP incorporates congestion control mechanisms to manage network congestion and prevent network congestion collapse. It dynamically adjusts its transmission rate based on network conditions, ensuring fair sharing of network resources.
    - UDP does not have built-in congestion control mechanisms. It simply sends packets at the desired rate, regardless of network congestion. If network conditions deteriorate, UDP packets may be dropped, resulting in potential packet loss.
5. Usage Scenarios:
    - TCP is commonly used in applications that require reliable and ordered data transmission, such as web browsing, email, file transfer (FTP), and streaming media.
    - UDP is suitable for applications that prioritize speed and efficiency over reliability, such as real-time streaming, voice and video communication, online gaming, and DNS (Domain Name System).

Understanding the differences between TCP and UDP is essential when designing network applications or selecting the appropriate protocol for specific use cases. While TCP provides reliable and ordered delivery at the cost of additional overhead, UDP offers lower latency and faster transmission but sacrifices reliability and ordered delivery.