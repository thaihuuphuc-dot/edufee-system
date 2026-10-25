import sympy as sp  
  
# Dinh nghia cac bien ky hieu  
a, b, c, d = sp.symbols('a b c d')  
A = sp.Matrix([[a, b], [c, d]])  
  
print("--- MA TRAN A ---")  
sp.pprint(A)  
  
det_A = A.det()  
print("\n--- DINH THUC DET(A) ---")  
print(det_A)  
  
print("\n--- MA TRAN NGHICH DAO A^-1 ---")  
A_inv = A.inv()  
sp.pprint(A_inv)  
  
print("\n--- KIEM CHUNG TICH A * A^-1 = I ---")  
identity_check = sp.simplify(A * A_inv)  
sp.pprint(identity_check) 
