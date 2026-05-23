@GetMapping("/orders/{id}")
public Order getOrder(@PathVariable Long id, Authentication auth) {
    Order order = orderRepository.findById(id).orElseThrow();
    if (!order.getUserId().equals(auth.getName())) {
        throw new AccessDeniedException("forbidden");
    }
    return order;
}
