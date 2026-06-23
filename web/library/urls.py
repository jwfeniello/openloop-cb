from django.urls import URLPattern, path
from .views import SampleLibraryList, PackList

urlpatterns = [
    path('sample', SampleLibraryList.as_view(), name="SampleList"),
    path('pack', PackList.as_view(), name="PackList")
]
